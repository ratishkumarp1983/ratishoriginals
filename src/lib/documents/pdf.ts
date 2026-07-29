import { PDFDocument } from "pdf-lib";

/**
 * PDF helpers built on pdf-lib (pure JS, no native dependencies). Used by the
 * upload pipeline to read the page count and to build the sample (preview)
 * PDF containing only the first N pages (SRS FR-4).
 */

export async function getPdfPageCount(bytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return doc.getPageCount();
}

/**
 * Produce a new PDF containing the first `samplePages` pages of `bytes`.
 * If the source has fewer pages, the sample is the whole document.
 */
export async function makeSamplePdf(
  bytes: Buffer,
  samplePages: number,
): Promise<{ sample: Buffer; totalPages: number }> {
  const src = await PDFDocument.load(bytes, { updateMetadata: false });
  const totalPages = src.getPageCount();
  const count = Math.max(1, Math.min(samplePages, totalPages));

  const out = await PDFDocument.create();
  const indices = Array.from({ length: count }, (_, i) => i);
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));

  const sampleBytes = await out.save();
  return { sample: Buffer.from(sampleBytes), totalPages };
}

/** Cheap structural check that a buffer is a PDF. */
export function looksLikePdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}
