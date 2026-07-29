import { prisma } from "@/lib/prisma";

/**
 * Admin revenue + engagement analytics (SRS FR-14). All figures are real,
 * computed from the operational tables; nothing is fabricated. Revenue combines
 * completed purchases (Purchase.amount, the discounted amount actually charged)
 * and activated memberships (UserMembership.amount, captured at activation).
 */
export type Range = "all" | "30d";

export function rangeStart(range: Range): Date | null {
  return range === "30d" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null;
}

/** purchases / views as a percentage; null when there are no views to divide by. */
export function conversionRate(purchases: number, views: number): number | null {
  if (views <= 0) return null;
  return (purchases / views) * 100;
}

const num = (d: { toString(): string } | null | undefined): number =>
  d ? Number(d.toString()) : 0;

export interface Overview {
  views: number;
  purchases: number;
  conversionPct: number | null;
  revenue: number;
  purchaseRevenue: number;
  membershipRevenue: number;
  activeMemberships: number;
  couponRedemptions: number;
  currency: string;
}

export async function getOverview(range: Range): Promise<Overview> {
  const start = rangeStart(range);
  const createdFrom = start ? { createdAt: { gte: start } } : {};
  const startedFrom = start ? { startedAt: { gte: start } } : {};
  const now = new Date();

  const [views, purchases, purchaseAgg, membershipAgg, activeMemberships, couponRedemptions] =
    await Promise.all([
      prisma.documentView.count({ where: createdFrom }),
      prisma.purchase.count({ where: { status: "COMPLETED", ...createdFrom } }),
      prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", ...createdFrom },
      }),
      prisma.userMembership.aggregate({
        _sum: { amount: true },
        where: { amount: { not: null }, ...startedFrom },
      }),
      prisma.userMembership.count({
        where: { status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      }),
      prisma.couponRedemption.count({ where: createdFrom }),
    ]);

  const purchaseRevenue = num(purchaseAgg._sum.amount);
  const membershipRevenue = num(membershipAgg._sum.amount);

  return {
    views,
    purchases,
    conversionPct: conversionRate(purchases, views),
    revenue: purchaseRevenue + membershipRevenue,
    purchaseRevenue,
    membershipRevenue,
    activeMemberships,
    couponRedemptions,
    currency: "INR",
  };
}

export interface TitleRow {
  documentId: string;
  title: string;
  slug: string;
  views: number;
  purchases: number;
  revenue: number;
  conversionPct: number | null;
}

export async function getTitlePerformance(range: Range): Promise<TitleRow[]> {
  const start = rangeStart(range);
  const createdFrom = start ? { createdAt: { gte: start } } : {};

  const [docs, viewGroups, purchaseGroups] = await Promise.all([
    prisma.document.findMany({ select: { id: true, title: true, slug: true } }),
    prisma.documentView.groupBy({ by: ["documentId"], _count: { _all: true }, where: createdFrom }),
    prisma.purchase.groupBy({
      by: ["documentId"],
      _count: { _all: true },
      _sum: { amount: true },
      where: { status: "COMPLETED", ...createdFrom },
    }),
  ]);

  const viewsBy = new Map(viewGroups.map((g) => [g.documentId, g._count._all]));
  const purchBy = new Map(
    purchaseGroups.map((g) => [g.documentId, { count: g._count._all, revenue: num(g._sum.amount) }]),
  );

  return docs
    .map((d) => {
      const views = viewsBy.get(d.id) ?? 0;
      const p = purchBy.get(d.id) ?? { count: 0, revenue: 0 };
      return {
        documentId: d.id,
        title: d.title,
        slug: d.slug,
        views,
        purchases: p.count,
        revenue: p.revenue,
        conversionPct: conversionRate(p.count, views),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.views - a.views || a.title.localeCompare(b.title));
}

export interface CouponRow {
  code: string;
  usedCount: number;
  usageLimit: number | null;
  redemptions: number;
}

/** Coupon usage is inherently cumulative, so it is reported all-time. */
export async function getCouponUsage(): Promise<CouponRow[]> {
  const coupons = await prisma.coupon.findMany({
    select: {
      code: true,
      usedCount: true,
      usageLimit: true,
      _count: { select: { redemptions: true } },
    },
    orderBy: [{ usedCount: "desc" }, { code: "asc" }],
  });
  return coupons.map((c) => ({
    code: c.code,
    usedCount: c.usedCount,
    usageLimit: c.usageLimit,
    redemptions: c._count.redemptions,
  }));
}
