"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Protected online reader (SRS §6). Renders one PDF page at a time with pdf.js,
 * fetching the bytes over a short-lived signed URL that the server only mints
 * after checking entitlement. A per-session watermark (reader identity + time)
 * is overlaid on every page as a deterrent. The original file URL is never
 * exposed; basic copy deterrents are applied (no context menu, no selection).
 *
 * In full mode it also persists reading progress (FR-10: resume where you left
 * off) and manages per-title bookmarks (named jump points).
 */
interface Bookmark {
  id: string;
  page: number;
  label: string | null;
}

interface PdfReaderProps {
  documentId: string;
  mode: "sample" | "full";
  watermark: string;
  title: string;
  /** Shown in sample mode to nudge purchase. */
  buyHref?: string;
  sampleNote?: string;
  /** Saved resume point (FR-10); applied in full mode only. */
  initialPage?: number;
  /** The reader's saved bookmarks for this title. */
  initialBookmarks?: Bookmark[];
  /** Whether progress + bookmark controls are available (full mode, signed in). */
  canBookmark?: boolean;
}

// pdf.js document/page types are loose here to avoid a hard dependency on the
// worker types in the client bundle.
type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };
type PdfPage = {
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }): { promise: Promise<void>; cancel(): void };
};

export function PdfReader({
  documentId,
  mode,
  watermark,
  title,
  buyHref,
  sampleNote,
  initialPage = 1,
  initialBookmarks = [],
  canBookmark = false,
}: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<PdfDoc | null>(null);
  const renderTaskRef = useRef<{ cancel(): void } | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resumedFrom, setResumedFrom] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [marksOpen, setMarksOpen] = useState(false);
  const [label, setLabel] = useState("");
  const savingRef = useRef(false);
  // Latest page, for the unload flush whose listeners close over a stale value.
  const pageNumRef = useRef(pageNum);
  useEffect(() => {
    pageNumRef.current = pageNum;
  }, [pageNum]);

  const trackProgress = mode === "full" && canBookmark;

  const renderPage = useCallback(async (n: number, s: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    const page = await pdf.getPage(n);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: s * dpr });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    const task = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch (err) {
      // Ignore cancellations (a newer render superseded this one); surface
      // anything else so a real failure is visible instead of a blank page.
      const name = (err as { name?: string })?.name;
      if (name !== "RenderingCancelledException") {
        setError(
          err instanceof Error ? err.message : "Failed to render this page.",
        );
      }
    }
  }, []);

  // Load the document once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/documents/${documentId}/read-url?mode=${mode}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(d.error ?? "Could not open the document.");
        }
        const { url } = (await res.json()) as { url: string };

        const pdfjs = await import("pdfjs-dist");
        // Hand pdf.js a real ES-module Worker. Passing a plain workerSrc string
        // can load the .mjs worker as a classic script, which lets getDocument
        // limp along but makes page.render() hang forever.
        pdfjs.GlobalWorkerOptions.workerPort = new Worker(
          new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
          { type: "module" },
        );
        const pdf = (await pdfjs.getDocument({
          url,
          // pdf.js v4 externalised these; without them standard-14 fonts and
          // CJK glyphs render blank.
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
        }).promise) as unknown as PdfDoc;
        if (cancelled) return;

        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        // Resume at the saved page in full mode (FR-10); clamp to the real range.
        const start =
          mode === "full" && initialPage > 1
            ? Math.min(initialPage, pdf.numPages)
            : 1;
        setPageNum(start);
        setResumedFrom(start > 1 ? start : 0);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load the reader.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [documentId, mode, initialPage]);

  // Re-render whenever the page or zoom changes and the doc is ready. The
  // cleanup cancels an in-flight render so switching pages quickly cannot leave
  // two renders racing on the same canvas.
  useEffect(() => {
    if (loading || !pdfRef.current) return;
    void renderPage(pageNum, scale);
    return () => renderTaskRef.current?.cancel();
  }, [pageNum, scale, loading, renderPage]);

  // Persist reading progress, debounced, once the reader has settled on a page.
  // Only in full mode for an entitled reader; samples never count.
  useEffect(() => {
    if (!trackProgress || loading || numPages === 0) return;
    const page = pageNum;
    const t = setTimeout(() => void saveProgress(documentId, page), 1200);
    return () => clearTimeout(t);
  }, [trackProgress, loading, numPages, pageNum, documentId]);

  // Flush the current page when the tab is hidden or unloaded, so the last page
  // read is not lost if the reader leaves without settling the debounce.
  useEffect(() => {
    if (!trackProgress) return;
    const flush = () => {
      if (numPages === 0) return;
      void saveProgress(documentId, pageNumRef.current, true);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [trackProgress, numPages, documentId]);

  const addBookmark = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const res = await fetch(`/api/documents/${documentId}/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pageNum, label: label.trim() || undefined }),
      });
      if (res.ok) {
        const { bookmark } = (await res.json()) as { bookmark: Bookmark };
        setBookmarks((prev) =>
          [...prev.filter((b) => b.page !== bookmark.page), bookmark].sort(
            (a, b) => a.page - b.page,
          ),
        );
        setLabel("");
      }
    } finally {
      savingRef.current = false;
    }
  }, [documentId, pageNum, label]);

  const removeBookmark = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/documents/${documentId}/bookmarks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkId: id }),
      });
      if (res.ok) setBookmarks((prev) => prev.filter((b) => b.id !== id));
    },
    [documentId],
  );

  const goTo = useCallback(
    (n: number) => setPageNum(Math.max(1, Math.min(numPages || n, n))),
    [numPages],
  );

  const wmSvg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='160'>` +
      `<text x='10' y='90' transform='rotate(-28 160 80)' fill='rgba(130,130,130,0.16)' ` +
      `font-family='sans-serif' font-size='13'>${escapeXml(watermark)}</text></svg>`,
  );

  const atStart = pageNum <= 1;
  const atEnd = pageNum >= numPages;
  const currentBookmarked = bookmarks.some((b) => b.page === pageNum);

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="sticky top-14 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {mode === "sample" && (
            <p className="text-xs text-amber-600">{sampleNote ?? "Sample preview"}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={atStart || loading}
          >
            Prev
          </Button>
          <span className="min-w-20 text-center text-sm tabular-nums text-neutral-500">
            {loading ? "…" : `${pageNum} / ${numPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            disabled={atEnd || loading}
          >
            Next
          </Button>
          <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))}
            disabled={loading}
            aria-label="Zoom out"
          >
            -
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}
            disabled={loading}
            aria-label="Zoom in"
          >
            +
          </Button>
          <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
          <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)}>
            {dark ? "Light" : "Dark"}
          </Button>
          {trackProgress && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMarksOpen((o) => !o)}
                disabled={loading}
                aria-expanded={marksOpen}
              >
                Bookmarks{bookmarks.length ? ` (${bookmarks.length})` : ""}
              </Button>
              {marksOpen && (
                <div className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-center gap-2">
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void addBookmark();
                      }}
                      placeholder={`Label for page ${pageNum} (optional)`}
                      maxLength={80}
                      className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                    />
                    <Button size="sm" onClick={() => void addBookmark()}>
                      {currentBookmarked ? "Update" : "Save"}
                    </Button>
                  </div>
                  <ul className="mt-3 max-h-64 space-y-1 overflow-auto">
                    {bookmarks.length === 0 ? (
                      <li className="py-2 text-center text-xs text-neutral-500">
                        No bookmarks yet.
                      </li>
                    ) : (
                      bookmarks.map((b) => (
                        <li key={b.id} className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              goTo(b.page);
                              setMarksOpen(false);
                            }}
                            className="flex-1 truncate rounded px-2 py-1 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <span className="tabular-nums text-neutral-500">
                              p.{b.page}
                            </span>{" "}
                            {b.label || "Bookmark"}
                          </button>
                          <button
                            onClick={() => void removeBookmark(b.id)}
                            className="rounded px-1.5 py-1 text-xs text-neutral-400 hover:text-red-600"
                            aria-label={`Remove bookmark on page ${b.page}`}
                          >
                            Remove
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resume note */}
      {resumedFrom > 0 && !loading && (
        <div className="flex items-center justify-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-1.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span>Resumed at page {resumedFrom}.</span>
          <button
            onClick={() => {
              setPageNum(1);
              setResumedFrom(0);
            }}
            className="font-medium underline"
          >
            Start from the beginning
          </button>
        </div>
      )}

      {/* Page canvas */}
      <div
        className={`flex flex-1 justify-center overflow-auto p-6 ${
          dark ? "bg-neutral-950" : "bg-neutral-100"
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {error ? (
          <div className="mt-16 max-w-sm text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
          </div>
        ) : (
          <div className="relative h-fit select-none shadow-lg">
            <canvas
              ref={canvasRef}
              className="block"
              style={dark ? { filter: "invert(1) hue-rotate(180deg)" } : undefined}
            />
            {/* Watermark overlay */}
            {!loading && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,${wmSvg}")`,
                  backgroundRepeat: "repeat",
                }}
              />
            )}
            {loading && (
              <div className="flex h-96 w-72 items-center justify-center text-sm text-neutral-400">
                Loading…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sample end-of-preview nudge */}
      {mode === "sample" && atEnd && !loading && buyHref && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 text-center dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            You have reached the end of the sample.
          </p>
          <Link
            href={buyHref}
            className="mt-2 inline-block text-sm font-medium underline"
          >
            Get the full book to keep reading
          </Link>
        </div>
      )}
    </div>
  );
}

/** Fire-and-forget progress save; keepalive lets it survive an unload. */
async function saveProgress(documentId: string, page: number, keepalive = false) {
  try {
    await fetch(`/api/documents/${documentId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
      keepalive,
    });
  } catch {
    // Progress is best-effort; a failed save must never disrupt reading.
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;",
  );
}
