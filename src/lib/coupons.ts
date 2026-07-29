import type { Coupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Coupon validation (SRS FR-8). All rules are enforced server-side; the client
 * only ever gets a yes/no plus the resulting discount for display. Never trust
 * a coupon or amount sent by the client.
 */
export interface CouponContext {
  code: string;
  userId: string;
  documentId: string;
  isMember: boolean;
}

export type CouponCheck =
  | { ok: true; coupon: Coupon }
  | { ok: false; error: string };

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function validateCoupon(ctx: CouponContext): Promise<CouponCheck> {
  const code = normalizeCode(ctx.code);
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    return { ok: false, error: "This coupon is not valid." };
  }

  if (coupon.expiryDate && coupon.expiryDate < new Date()) {
    return { ok: false, error: "This coupon has expired." };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }

  if (coupon.documentId && coupon.documentId !== ctx.documentId) {
    return { ok: false, error: "This coupon does not apply to this title." };
  }

  if (coupon.memberOnly && !ctx.isMember) {
    return { ok: false, error: "This coupon is for members only." };
  }

  // A coupon can be redeemed at most once per user (enforced at the DB too), so
  // reject a prior redemption regardless of the one-time flag.
  const prior = await prisma.couponRedemption.findFirst({
    where: { couponId: coupon.id, userId: ctx.userId },
    select: { id: true },
  });
  if (prior) {
    return { ok: false, error: "You have already used this coupon." };
  }

  return { ok: true, coupon };
}
