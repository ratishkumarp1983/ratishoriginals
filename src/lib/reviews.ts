import { prisma } from "@/lib/prisma";

/**
 * Reviews & ratings (SRS FR-12). Eligibility, the rating summary, and the
 * public review list. A reader may review a title only if they have a completed
 * purchase or an active membership that includes it; the verified-purchase and
 * verified-member badges are derived from that access, never self-asserted.
 */
export type ReviewSort = "helpful" | "highest" | "lowest" | "newest" | "oldest";

export interface Eligibility {
  canReview: boolean;
  isVerifiedPurchase: boolean;
  isVerifiedMember: boolean;
  purchaseId: string | null;
}

export async function getReviewEligibility(
  userId: string,
  documentId: string,
): Promise<Eligibility> {
  const now = new Date();
  const [purchase, membership] = await Promise.all([
    prisma.purchase.findFirst({
      where: { userId, documentId, status: "COMPLETED" },
      select: { id: true },
    }),
    prisma.userMembership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        membership: { documents: { some: { documentId } } },
      },
      select: { id: true },
    }),
  ]);
  return {
    canReview: !!purchase || !!membership,
    isVerifiedPurchase: !!purchase,
    isVerifiedMember: !!membership,
    purchaseId: purchase?.id ?? null,
  };
}

export interface RatingSummary {
  average: number; // 0 when no ratings
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Pure: average (1 dp) + per-star distribution from a list of 1..5 ratings. */
export function summarize(ratings: number[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let sum = 0;
  for (const r of ratings) {
    if (r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5] += 1;
      sum += r;
    }
  }
  const count = ratings.length;
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  return { average, count, distribution };
}

export async function getRatingSummary(documentId: string): Promise<RatingSummary> {
  const rows = await prisma.review.findMany({
    where: { documentId, isVisible: true },
    select: { rating: true },
  });
  return summarize(rows.map((r) => r.rating));
}

const orderFor = (sort: ReviewSort) => {
  switch (sort) {
    case "highest":
      return [{ rating: "desc" as const }, { createdAt: "desc" as const }];
    case "lowest":
      return [{ rating: "asc" as const }, { createdAt: "desc" as const }];
    case "oldest":
      return [{ createdAt: "asc" as const }];
    case "newest":
      return [{ createdAt: "desc" as const }];
    case "helpful":
    default:
      return [{ helpfulCount: "desc" as const }, { createdAt: "desc" as const }];
  }
};

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  review: string;
  containsSpoiler: boolean;
  isVerifiedPurchase: boolean;
  isVerifiedMember: boolean;
  isPinned: boolean;
  adminReply: string | null;
  adminReplyAt: Date | null;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: Date;
  edited: boolean;
  authorName: string;
  isOwn: boolean;
  viewerVote: "HELPFUL" | "NOT_HELPFUL" | null;
}

/**
 * Visible reviews for a title. Pinned (featured) reviews always lead; the chosen
 * sort orders the rest. The viewer's own vote is attached so the UI can reflect
 * it, and the display name is trimmed to a first name + initial for privacy.
 */
export async function listReviews(
  documentId: string,
  sort: ReviewSort,
  viewerId: string | null,
): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { documentId, isVisible: true },
    orderBy: [{ isPinned: "desc" }, ...orderFor(sort)],
    select: {
      id: true,
      userId: true,
      rating: true,
      title: true,
      review: true,
      containsSpoiler: true,
      isVerifiedPurchase: true,
      isVerifiedMember: true,
      isPinned: true,
      adminReply: true,
      adminReplyAt: true,
      helpfulCount: true,
      notHelpfulCount: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
      _count: { select: { edits: true } },
    },
  });

  let votes = new Map<string, "HELPFUL" | "NOT_HELPFUL">();
  if (viewerId && reviews.length) {
    const rows = await prisma.reviewVote.findMany({
      where: { userId: viewerId, reviewId: { in: reviews.map((r) => r.id) } },
      select: { reviewId: true, voteType: true },
    });
    votes = new Map(rows.map((v) => [v.reviewId, v.voteType]));
  }

  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    review: r.review,
    containsSpoiler: r.containsSpoiler,
    isVerifiedPurchase: r.isVerifiedPurchase,
    isVerifiedMember: r.isVerifiedMember,
    isPinned: r.isPinned,
    adminReply: r.adminReply,
    adminReplyAt: r.adminReplyAt,
    helpfulCount: r.helpfulCount,
    notHelpfulCount: r.notHelpfulCount,
    createdAt: r.createdAt,
    edited: r._count.edits > 0,
    authorName: displayName(r.user.name, r.user.email),
    isOwn: r.userId === viewerId,
    viewerVote: votes.get(r.id) ?? null,
  }));
}

export async function getOwnReview(userId: string, documentId: string) {
  return prisma.review.findUnique({
    where: { userId_documentId: { userId, documentId } },
    select: {
      id: true,
      rating: true,
      title: true,
      review: true,
      containsSpoiler: true,
      isVisible: true,
    },
  });
}

/** First name + last initial, e.g. "Ratish K." Falls back to the email local part. */
function displayName(name: string | null, email: string): string {
  const base = name?.trim() || email.split("@")[0] || "Reader";
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
}
