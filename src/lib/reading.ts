/**
 * Reading-progress math (SRS FR-10), kept pure so it can be unit-tested and so
 * the server never trusts a client-sent completion figure. The page is clamped
 * to the document's real range; completion is derived from the page.
 */
export interface Progress {
  page: number;
  completionPercent: number;
}

export function computeProgress(rawPage: number, pageCount: number | null): Progress {
  const floor = Math.floor(rawPage);
  const total = pageCount && pageCount > 0 ? pageCount : null;
  const page = Math.max(1, Math.min(total ?? floor, floor));
  const completionPercent = total
    ? Math.max(0, Math.min(100, Math.round((page / total) * 100)))
    : 0;
  return { page, completionPercent };
}
