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

  // 4. Generate the sample (preview) PDF.
  const pageCount = await getPdfPageCount(pdf);
  const { sample } = await makeSamplePdf(pdf, input.samplePages);
  const effectiveSample = Math.max(1, Math.min(input.samplePages, pageCount));

  // 5. Store protected assets.
  const store = storage();
  const originalKey = docKeys.original(documentId);
  const sampleKey = docKeys.sample(documentId);
  await store.put(originalKey, pdf, "application/pdf");
  await store.put(sampleKey, sample, "application/pdf");

  let coverKey: string | null = null;
  if (cover) {
    if (cover.bytes.length > MAX_COVER_BYTES) {
      throw new UploadError("Cover image exceeds the 5 MB limit.");
    }
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
