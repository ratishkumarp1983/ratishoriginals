import type { Coupon, Document } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/adapters/payments";
import { validateCoupon } from "@/lib/coupons";
import { applyDiscount, toMinor } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { isActiveMember } from "@/lib/membership";
import type { SessionUser } from "@/lib/auth-helpers";

export class CheckoutError extends Error {}

// A PENDING order older than this is treated as abandoned and no longer holds a
// coupon reservation, so a stuck checkout cannot lock a promo forever.
const RESERVATION_WINDOW_MS = 30 * 60 * 1000;

/** A completed purchase for this user+document, if any (lifetime access). */
export async function getOwnedPurchase(userId: string, documentId: string) {
  const p = await prisma.purchase.findUnique({
    where: { userId_documentId: { userId, documentId } },
    select: { id: true, status: true },
  });
  return p?.status === "COMPLETED" ? p : null;
}

interface CreateOrderArgs {
  user: SessionUser;
  document: Pick<Document, "id" | "slug" | "title" | "price" | "currency">;
  couponCode?: string | null;
  ip?: string | null;
}

export type CreateOrderResult =
  | { kind: "granted"; slug: string } // free or fully discounted
  | {
      kind: "order";
      purchaseId: string;
      orderId: string;
      amountMinor: number;
      currency: string;
      keyId: string;
      driver: string;
    };

/**
 * A coupon's limits are enforced BEFORE payment (the discount is charged at
 * completion, so eligibility has to be locked at order creation). We count both
 * settled redemptions and fresh in-flight orders as consuming a slot, which
 * closes the create-then-complete gap that let one user redeem a capped or
 * one-time coupon repeatedly.
 */
async function reserveCoupon(coupon: Coupon, userId: string, documentId: string) {
  const cutoff = new Date(Date.now() - RESERVATION_WINDOW_MS);

  // One redemption per user (also a DB constraint). Count settled redemptions
  // plus this user's fresh pending orders that carry the coupon on other titles.
  const [userRedemptions, userPending] = await Promise.all([
    prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } }),
    prisma.purchase.count({
      where: {
        couponId: coupon.id,
        userId,
        status: "PENDING",
        createdAt: { gt: cutoff },
        documentId: { not: documentId },
      },
    }),
  ]);
  if (userRedemptions + userPending >= 1) {
    throw new CheckoutError("You have already used this coupon.");
  }

  if (coupon.usageLimit != null) {
    const globalPending = await prisma.purchase.count({
      where: {
        couponId: coupon.id,
        status: "PENDING",
        createdAt: { gt: cutoff },
        NOT: { userId, documentId },
      },
    });
    if (coupon.usedCount + globalPending >= coupon.usageLimit) {
      throw new CheckoutError("This coupon has reached its usage limit.");
    }
  }
}

/**
 * Price the document, apply a coupon if present, then either grant access
 * immediately (free / 100% off) or open a payment order. The final amount is
 * always computed here, never taken from the client (SRS §7). The purchase is
 * upserted so a user can never accumulate two orders for the same title.
 */
export async function createOrder(
  args: CreateOrderArgs,
): Promise<CreateOrderResult> {
  const { user, document } = args;

  if (await getOwnedPurchase(user.id, document.id)) {
    throw new CheckoutError("You already own this title.");
  }

  const base = Number(document.price.toString());
  let finalAmount = base;
  let couponId: string | null = null;

  if (args.couponCode?.trim()) {
    const check = await validateCoupon({
      code: args.couponCode,
      userId: user.id,
      documentId: document.id,
      isMember: await isActiveMember(user.id),
    });
    if (!check.ok) throw new CheckoutError(check.error);
    await reserveCoupon(check.coupon, user.id, document.id);
    couponId = check.coupon.id;
    finalAmount = applyDiscount(
      base,
      check.coupon.discountType,
      Number(check.coupon.discountValue.toString()),
    ).finalAmount;
  }

  const key = { userId_documentId: { userId: user.id, documentId: document.id } };

  // Free or fully discounted: grant access without a payment round-trip.
  if (finalAmount <= 0) {
    const purchase = await prisma.purchase.upsert({
      where: key,
      create: {
        userId: user.id,
        documentId: document.id,
        amount: 0,
        currency: document.currency,
        status: "COMPLETED",
        couponId,
      },
      update: {
        amount: 0,
        currency: document.currency,
        status: "COMPLETED",
        couponId,
        razorpayOrderId: null,
        razorpayPaymentId: null,
      },
    });
    await recordRedemption(purchase.id, user.id, couponId);
    await audit({
      action: "PURCHASE_COMPLETE",
      actorId: user.id,
      targetType: "Purchase",
      targetId: purchase.id,
      metadata: { documentId: document.id, title: document.title, amount: 0, free: true },
      ip: args.ip,
    });
    return { kind: "granted", slug: document.slug };
  }

  const gateway = payments();
  const purchase = await prisma.purchase.upsert({
    where: key,
    create: {
      userId: user.id,
      documentId: document.id,
      amount: finalAmount,
      currency: document.currency,
      status: "PENDING",
      couponId,
    },
    update: {
      amount: finalAmount,
      currency: document.currency,
      status: "PENDING",
      couponId,
      razorpayPaymentId: null,
    },
  });

  const order = await gateway.createOrder({
    amountMinor: toMinor(finalAmount),
    currency: document.currency,
    receipt: purchase.id,
    notes: { purchaseId: purchase.id, documentId: document.id },
  });

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { razorpayOrderId: order.orderId },
  });

  return {
    kind: "order",
    purchaseId: purchase.id,
    orderId: order.orderId,
    amountMinor: order.amountMinor,
    currency: order.currency,
    keyId: order.keyId,
    driver: gateway.name,
  };
}

/**
 * Mark a purchase COMPLETED from its order id. Idempotent: a second call (e.g.
 * webhook after the client callback) is a no-op. Records the coupon redemption
 * and increments the counter atomically, tolerating the one-per-user DB
 * constraint as a backstop.
 */
export async function completePurchaseByOrder(
  orderId: string,
  paymentId: string,
): Promise<"completed" | "already" | "unknown"> {
  const purchase = await prisma.purchase.findUnique({
    where: { razorpayOrderId: orderId },
    include: { document: { select: { id: true, title: true } } },
  });
  if (!purchase) return "unknown";
  if (purchase.status === "COMPLETED") return "already";

  await prisma.$transaction(async (tx) => {
    const updated = await tx.purchase.updateMany({
      where: { id: purchase.id, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", razorpayPaymentId: paymentId },
    });
    if (updated.count === 0) return; // a concurrent completion won

    if (purchase.couponId) {
      try {
        await tx.couponRedemption.create({
          data: {
            couponId: purchase.couponId,
            userId: purchase.userId,
            purchaseId: purchase.id,
          },
        });
        await tx.coupon.update({
          where: { id: purchase.couponId },
          data: { usedCount: { increment: 1 } },
        });
      } catch (err) {
        // Already redeemed by this user (unique backstop). Do not double count.
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    }
  });

  await audit({
    action: "PURCHASE_COMPLETE",
    actorId: purchase.userId,
    targetType: "Purchase",
    targetId: purchase.id,
    metadata: {
      documentId: purchase.documentId,
      title: purchase.document.title,
      amount: purchase.amount.toString(),
      paymentId,
    },
  });

  return "completed";
}

async function recordRedemption(
  purchaseId: string,
  userId: string,
  couponId: string | null,
) {
  if (!couponId) return;
  try {
    await prisma.$transaction([
      prisma.couponRedemption.create({ data: { couponId, userId, purchaseId } }),
      prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    if ((err as { code?: string }).code !== "P2002") throw err;
  }
}
