import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata: Metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const [coupons, documents] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { document: { select: { title: true } } },
    }),
    prisma.document.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Percentage or fixed discounts, with optional expiry, usage limits, and
          member or title targeting.
        </p>
      </div>
      <CouponManager
        documents={documents}
        initialCoupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue.toString(),
          expiryDate: c.expiryDate ? c.expiryDate.toISOString().slice(0, 10) : null,
          usageLimit: c.usageLimit,
          usedCount: c.usedCount,
          oneTimePerUser: c.oneTimePerUser,
          memberOnly: c.memberOnly,
          active: c.active,
          documentTitle: c.document?.title ?? null,
        }))}
      />
    </div>
  );
}
