import { Stars } from "./stars";
import type { RatingSummary } from "@/lib/reviews";

/** Average, total, and the 5-bar rating distribution (SRS FR-12 review display). */
export function RatingSummaryBlock({ summary }: { summary: RatingSummary }) {
  const { average, count, distribution } = summary;

  if (count === 0) {
    return <p className="text-sm text-neutral-500">No ratings yet. Be the first to review.</p>;
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
      <div className="text-center">
        <div className="text-4xl font-semibold tabular-nums">{average.toFixed(1)}</div>
        <Stars value={average} className="mt-1 text-lg" />
        <div className="mt-1 text-xs text-neutral-500">
          {count} {count === 1 ? "rating" : "ratings"}
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const c = distribution[star as 1 | 2 | 3 | 4 | 5];
          const pct = count ? (c / count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-5 tabular-nums text-neutral-500">{star}★</span>
              <div className="h-2 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="h-2 rounded-full bg-brand-gold" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right tabular-nums text-neutral-500">{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
