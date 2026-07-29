/**
 * Deterministic storage keys for a document's protected assets. These keys are
 * opaque to clients and never exposed directly - bytes are served only through
 * authenticated app routes / short-lived signed URLs.
 */
export const docKeys = {
  original: (id: string) => `documents/${id}/original.pdf`,
  sample: (id: string) => `documents/${id}/sample.pdf`,
  cover: (id: string, ext: string) => `documents/${id}/cover.${ext}`,
};

/** Map a cover file extension to a content type for serving. */
export function coverContentType(ext: string): string {
  switch (ext.toLowerCase()) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}
