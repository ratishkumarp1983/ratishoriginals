import Link from "next/link";
import {
  getRatingSummary,
  listReviews,
  getReviewEligibility,
  getOwnReview,
  type ReviewSort,
  type PublicReview,
} from "@/lib/reviews";
import type { SessionUser } from "@/lib/auth-helpers";
import { Stars } from "./stars";
import { RatingSummaryBlock } from "./rating-summary";
import { ReviewForm } from "./review-form";
import { SpoilerBody } from "./spoiler-body";
import { HelpfulVotes } from "./helpful-votes";

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "helpful", label: "Most helpful" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
  { value: "newest", label: "Most recent" },
  { value: "oldest", label: "Oldest" },
];

const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);

export async function ReviewsSection({
  documentId,
  slug,
  sort,
  user,
}: {
  documentId: string;
  slug: string;
  sort: ReviewSort;
  user: SessionUser | null;
}) {
  const [summary, reviews] = await Promise.all([
    getRatingSummary(documentId),
    listReviews(documentId, sort, user?.id ?? null),
  ]);

  let canReview = false;
  let own = null;
  if (user) {
    const [eligibility, ownReview] = await Promise.all([
      getReviewEligibility(user.id, documentId),
      getOwnReview(user.id, documentId),
    ]);
    canReview = eligibility.canReview;
    own = ownReview;
  }

  const signInHref = `/login?callbackUrl=${encodeURIComponent(`/book/${slug}`)}`;

  return (
    <section id="reviews" className="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-800">
      <h2 className="text-xl font-semibold tracking-tight">Ratings & reviews</h2>

      <div className="mt-4">
        <RatingSummaryBlock summary={summary} />
      </div>

      {/* Write area */}
      <div className="mt-6">
        {!user ? (
          <Link href={signInHref} className="text-sm font-medium underline">
            Sign in to write a review
          </Link>
        ) : canReview || own ? (
          <ReviewForm
            documentId={documentId}
            initial={
              own
                ? {
                    rating: own.rating,
                    title: own.title,
                    review: own.review,
                    containsSpoiler: own.containsSpoiler,
                  }
                : null
            }
          />
        ) : (
          <p className="text-sm text-neutral-500">
            You can review this title once you own it or read it with a membership.
          </p>
        )}
      </div>

      {/* Sort + list */}
      {reviews.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-neutral-500">Sort:</span>
            {SORTS.map((s) => (
              <Link
                key={s.value}
                href={`/book/${slug}?rsort=${s.value}#reviews`}
                className={`rounded-full border px-3 py-1 ${
                  s.value === sort
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          <ul className="mt-4 space-y-6">
            {reviews.map((r) => (
              <ReviewItem
                key={r.id}
                review={r}
                isAuthenticated={!!user}
                signInHref={signInHref}
                fmtDate={fmtDate}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ReviewItem({
  review: r,
  isAuthenticated,
  signInHref,
  fmtDate,
}: {
  review: PublicReview;
  isAuthenticated: boolean;
  signInHref: string;
  fmtDate: (d: Date) => string;
}) {
  const badge = r.isVerifiedPurchase
    ? "Verified purchase"
    : r.isVerifiedMember
      ? "Verified member"
      : null;

  return (
    <li className="border-b border-neutral-100 pb-6 last:border-0 dark:border-neutral-900">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={r.rating} />
        {r.title && <span className="text-sm font-semibold">{r.title}</span>}
        {r.isPinned && (
          <span className="rounded bg-brand-gold/15 px-1.5 py-0.5 text-[11px] font-medium text-brand-navy dark:text-brand-gold">
            Featured
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span className="font-medium text-neutral-600 dark:text-neutral-400">
          {r.authorName}
          {r.isOwn ? " (you)" : ""}
        </span>
        {badge && (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            {badge}
          </span>
        )}
        <span>{fmtDate(r.createdAt)}</span>
        {r.edited && <span>(edited)</span>}
      </div>

      <SpoilerBody text={r.review} spoiler={r.containsSpoiler} />

      {r.adminReply && (
        <div className="mt-3 rounded-lg border-l-2 border-brand-gold bg-neutral-50 p-3 dark:bg-neutral-900">
          <p className="text-xs font-semibold text-brand-navy dark:text-brand-gold">
            Response from Ratish Originals
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">
            {r.adminReply}
          </p>
        </div>
      )}

      <HelpfulVotes
        reviewId={r.id}
        helpful={r.helpfulCount}
        notHelpful={r.notHelpfulCount}
        viewerVote={r.viewerVote}
        isOwn={r.isOwn}
        isAuthenticated={isAuthenticated}
        signInHref={signInHref}
      />
    </li>
  );
}
