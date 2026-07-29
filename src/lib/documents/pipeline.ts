import { storage } from "@/lib/adapters/storage";
import { scanner } from "@/lib/adapters/scan";
import { converter, ConversionError, SUPPORTED_EXTENSIONS } from "@/lib/adapters/convert";
import { getPdfPageCount, makeSamplePdf, looksLikePdf } from "@/lib/documents/pdf";
import { docKeys, coverContentType } from "@/lib/documents/keys";

/**
 * Upload processing pipeline (SRS FR-2):
 *   validate -> virus scan -> convert to PDF -> generate sample -> store.
 *
 * Returns the facts the caller needs to persist a Document row. It does not
 * touch the database, so it can be unit-tested in isolation.
 */
export class UploadError extends Error {}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ProcessedUpload {
  originalKey: string;
  sampleKey: string;
  coverKey: string | null;
  fileType: string;
  pageCount: number;
  samplePages: number;
}

export interface ProcessUploadInput {
  documentId: string;
  fileName: string;
  fileBytes: Buffer;
  samplePages: number;
  cover?: { bytes: Buffer; ext: string } | null;
}

function extOf(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return (m?.[1] ?? "").toLowerCase();
}

/** Structural check that a buffer is a supported raster image. */
function looksLikeImage(bytes: Buffer): boolean {
  const b = bytes;
  // PNG
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return true;
  // JPEG
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  // GIF
  if (b.length > 6 && b.subarray(0, 3).toString("latin1") === "GIF") return true;
  // WEBP (RIFF....WEBP)
  if (
    b.length > 12 &&
    b.subarray(0, 4).toString("latin1") === "RIFF" &&
    b.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return true;
  return false;
}

export async function processUpload(
  input: ProcessUploadInput,
): Promise<ProcessedUpload> {
  const { documentId, fileName, fileBytes, cover } = input;

  // 1. Validate.
  if (fileBytes.length === 0) throw new UploadError("The uploaded file is empty.");
  if (fileBytes.length > MAX_UPLOAD_BYTES) {
    throw new UploadError("File exceeds the 50 MB limit.");
  }
  const ext = extOf(fileName);
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new UploadError(
      `Unsupported file type ".${ext}". Allowed: ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    );
  }

  // Validate the cover fully BEFORE storing anything, so a bad cover can never
  // orphan the document bytes we would otherwise have written first.
  if (cover) {
    if (cover.bytes.length > MAX_COVER_BYTES) {
      throw new UploadError("Cover image exceeds the 5 MB limit.");
    }
    if (!looksLikeImage(cover.bytes)) {
      throw new UploadError("The cover must be a PNG, JPEG, GIF, or WebP image.");
    }
  }

  // 2. Virus scan (original bytes).
  const scan = await scanner().scan(fileBytes);
  if (!scan.clean) {
    throw new UploadError(`File failed the virus scan: ${scan.reason ?? "unsafe"}.`);
  }

  // 3. Convert to PDF (passthrough for PDF).
  let pdf: Buffer;
  try {
    pdf = (await converter().toPdf(fileBytes, ext)).pdf;
  } catch (err) {
    if (err instanceof ConversionError) throw new UploadError(err.message);
    throw err;
  }
  if (!looksLikePdf(pdf)) {
    throw new UploadError("The file is not a valid PDF after processing.");
  }

  // 4. Read page count and generate the sample (preview) PDF. Parse failures
  //    (corrupt / encrypted / zero-page) become clean 400s, not 500s.
  let pageCount: number;
  try {
    pageCount = await getPdfPageCount(pdf);
  } catch {
    throw new UploadError(
      "The file could not be read as a PDF — it may be corrupt or password-protected.",
    );
  }
  if (pageCount < 1) {
    throw new UploadError("The PDF appears to have no pages.");
  }

  let sample: Buffer;
  try {
    sample = (await makeSamplePdf(pdf, input.samplePages)).sample;
  } catch {
    throw new UploadError("Could not generate a preview sample from this PDF.");
  }
  const effectiveSample = Math.max(1, Math.min(input.samplePages, pageCount));

  // 5. Store protected assets (everything above has already been validated).
  const store = storage();
  const originalKey = docKeys.original(documentId);
  const sampleKey = docKeys.sample(documentId);
  await store.put(originalKey, pdf, "application/pdf");
  await store.put(sampleKey, sample, "application/pdf");

  let coverKey: string | null = null;
  if (cover) {
    coverKey = docKeys.cover(documentId, cover.ext);
    await store.put(coverKey, cover.bytes, coverContentType(cover.ext));
  }

  return {
    originalKey,
    sampleKey,
    coverKey,
    fileType: ext,
    pageCount,
    samplePages: effectiveSample,
  };
}
