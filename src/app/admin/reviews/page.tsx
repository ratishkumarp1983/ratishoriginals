import Link from "next/link";
import type { Metadata } from "next";
import { getReviewAnalytics, getModerationList } from "@/lib/review-admin";
import { Stars } from "@/components/reviews/stars";
import { ReviewModActions } from "@/components/admin/review-mod-actions";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminReviewsPage() {
  const [analytics, rows] = await Promise.all([getReviewAnalytics(), getModerationList()]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>

      {/* Analytics */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <dt className="text-sm text-neutral-500">Average rating</dt>
          <dd className="mt-1 flex items-center gap-2 text-3xl font-semibold tabular-nums">
            {analytics.average.toFixed(1)}
            <Stars value={analytics.average} className="text-base" />
          </dd>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <dt className="text-sm text-neutral-500">Total reviews</dt>
          <dd className="mt-1 text-3xl font-semibold tabular-nums">{analytics.total}</dd>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-3">
        <RatingTable title="Highest rated" rows={analytics.highest} />
        <RatingTable title="Lowest rated" rows={analytics.lowest} />
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">Most helpful</h2>
          {analytics.mostHelpful.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No helpful votes yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {analytics.mostHelpful.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-2">
                  <Link href={`/book/${r.slug}#reviews`} className="min-w-0">
                    <span className="line-clamp-1">{r.title || r.documentTitle}</span>
                    <span className="text-xs text-neutral-500">{r.documentTitle}</span>
                  </Link>
                  <span className="whitespace-nowrap text-xs text-neutral-500">
                    {r.helpfulCount} helpful
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Moderation list */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Moderation</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Newest first. Hidden reviews stay out of public averages and lists.
        </p>
        <div className="mt-4 space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">No reviews yet.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-4 ${
                  r.isVisible
                    ? "border-neutral-200 dark:border-neutral-800"
                    : "border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  {r.title && <span className="text-sm font-semibold">{r.title}</span>}
                  {r.isPinned && (
                    <span className="rounded bg-brand-gold/15 px-1.5 py-0.5 text-[11px] font-medium text-brand-navy dark:text-brand-gold">
                      Featured
                    </span>
                  )}
                  {!r.isVisible && (
                    <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                      Hidden
                    </span>
                  )}
                  {r.containsSpoiler && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Spoiler
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  <Link href={`/book/${r.slug}#reviews`} className="hover:underline">
                    {r.documentTitle}
                  </Link>{" "}
                  · {r.author} · {fmtDate(r.createdAt)} · {r.helpfulCount} helpful
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">
                  {r.review}
                </p>
                {r.adminReply && (
                  <p className="mt-2 border-l-2 border-brand-gold pl-2 text-sm text-neutral-600 dark:text-neutral-400">
                    Reply: {r.adminReply}
                  </p>
                )}
                <div className="mt-3">
                  <ReviewModActions
                    reviewId={r.id}
                    isVisible={r.isVisible}
                    isPinned={r.isPinned}
                    adminReply={r.adminReply}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function RatingTable({
  title,
  rows,
}: {
  title: string;
  rows: { documentId: string; title: string; slug: string; average: number; count: number }[];
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No rated titles yet.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {rows.map((t) => (
            <li key={t.documentId} className="flex items-center justify-between gap-2">
              <Link href={`/book/${t.slug}#reviews`} className="line-clamp-1 min-w-0">
                {t.title}
              </Link>
              <span className="whitespace-nowrap text-xs text-neutral-500">
                {t.average.toFixed(1)} ({t.count})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
