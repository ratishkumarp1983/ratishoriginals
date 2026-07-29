import { prisma } from "@/lib/prisma";

/**
 * Admin-side review analytics and the moderation list (SRS FR-12). Ratings
 * analytics count only visible reviews, so hidden (moderated) reviews never skew
 * the averages shown to the admin or the public.
 */
export interface TitleRating {
  documentId: string;
  title: string;
  slug: string;
  average: number;
  count: number;
}

export interface HelpfulReview {
  id: string;
  rating: number;
  title: string | null;
  helpfulCount: number;
  documentTitle: string;
  slug: string;
}

export interface ReviewAnalytics {
  average: number;
  total: number;
  highest: TitleRating[];
  lowest: TitleRating[];
  mostHelpful: HelpfulReview[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function getReviewAnalytics(): Promise<ReviewAnalytics> {
  const [agg, groups, helpful] = await Promise.all([
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true }, where: { isVisible: true } }),
    prisma.review.groupBy({
      by: ["documentId"],
      _avg: { rating: true },
      _count: { _all: true },
      where: { isVisible: true },
    }),
    prisma.review.findMany({
      where: { isVisible: true, helpfulCount: { gt: 0 } },
      orderBy: { helpfulCount: "desc" },
      take: 5,
      select: {
        id: true,
        rating: true,
        title: true,
        helpfulCount: true,
        document: { select: { title: true, slug: true } },
      },
    }),
  ]);

  const docs = await prisma.document.findMany({
    where: { id: { in: groups.map((g) => g.documentId) } },
    select: { id: true, title: true, slug: true },
  });
  const docMap = new Map(docs.map((d) => [d.id, d]));

  const titleRatings: TitleRating[] = groups
    .map((g) => {
      const d = docMap.get(g.documentId);
      return {
        documentId: g.documentId,
        title: d?.title ?? "",
        slug: d?.slug ?? "",
        average: round1(g._avg.rating ?? 0),
        count: g._count._all,
      };
    })
    .filter((t) => t.title);

  const highest = [...titleRatings].sort((a, b) => b.average - a.average || b.count - a.count).slice(0, 5);
  const lowest = [...titleRatings].sort((a, b) => a.average - b.average || b.count - a.count).slice(0, 5);

  return {
    average: round1(agg._avg.rating ?? 0),
    total: agg._count._all,
    highest,
    lowest,
    mostHelpful: helpful.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      helpfulCount: r.helpfulCount,
      documentTitle: r.document.title,
      slug: r.document.slug,
    })),
  };
}

export interface ModerationRow {
  id: string;
  rating: number;
  title: string | null;
  review: string;
  isVisible: boolean;
  isPinned: boolean;
  containsSpoiler: boolean;
  adminReply: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: Date;
  documentTitle: string;
  slug: string;
  author: string;
}

/** Every review (visible and hidden), newest first, for the moderation table. */
export async function getModerationList(): Promise<ModerationRow[]> {
  const rows = await prisma.review.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      rating: true,
      title: true,
      review: true,
      isVisible: true,
      isPinned: true,
      containsSpoiler: true,
      adminReply: true,
      helpfulCount: true,
      notHelpfulCount: true,
      createdAt: true,
      document: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    review: r.review,
    isVisible: r.isVisible,
    isPinned: r.isPinned,
    containsSpoiler: r.containsSpoiler,
    adminReply: r.adminReply,
    helpfulCount: r.helpfulCount,
    notHelpfulCount: r.notHelpfulCount,
    createdAt: r.createdAt,
    documentTitle: r.document.title,
    slug: r.document.slug,
    author: r.user.name?.trim() || r.user.email,
  }));
}
