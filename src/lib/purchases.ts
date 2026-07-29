import type { Document } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/adapters/payments";
import { validateCoupon } from "@/lib/coupons";
import { applyDiscount, toMinor } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { isActiveMember } from "@/lib/membership";
import type { SessionUser } from "@/lib/auth-helpers";

export class CheckoutError extends Error {}

/** A completed purchase for this user+document, if any (lifetime access). */
export async function getOwnedPurchase(userId: string, documentId: string) {
  return prisma.purchase.findFirst({
    where: { userId, documentId, status: "COMPLETED" },
    select: { id: true },
  });
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
 * Price the document, apply a coupon if present, then either grant access
 * immediately (free / 100% off) or open a payment order. The final amount is
 * always computed here, never taken from the client (SRS §7).
 */
export async function createOrder(
  args: CreateOrderArgs,
): Promise<CreateOrderResult> {
  const { user, document } = args;

  const already = await getOwnedPurchase(user.id, document.id);
  if (already) throw new CheckoutError("You already own this title.");

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
    couponId = check.coupon.id;
    finalAmount = applyDiscount(
      base,
      check.coupon.discountType,
      Number(check.coupon.discountValue.toString()),
    ).finalAmount;
  }

  // Free or fully discounted: grant access without a payment round-trip.
  if (finalAmount <= 0) {
    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        documentId: document.id,
        amount: 0,
        currency: document.currency,
        status: "COMPLETED",
        couponId,
      },
    });
    await recordRedemptionAndAudit(purchase.id, user.id, couponId, document, args.ip, 0);
    return { kind: "granted", slug: document.slug };
  }

  const gateway = payments();
  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      documentId: document.id,
      amount: finalAmount,
      currency: document.currency,
      status: "PENDING",
      couponId,
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
 * webhook after the client callback) is a no-op. Records coupon redemption and
 * grants lifetime access.
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
    // Another concurrent completion won the race.
    if (updated.count === 0) return;

    if (purchase.couponId) {
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

async function recordRedemptionAndAudit(
  purchaseId: string,
  userId: string,
  couponId: string | null,
  document: { id: string; title: string },
  ip: string | null | undefined,
  amount: number,
) {
  if (couponId) {
    await prisma.$transaction([
      prisma.couponRedemption.create({
        data: { couponId, userId, purchaseId },
      }),
      prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  }
  await audit({
    action: "PURCHASE_COMPLETE",
    actorId: userId,
    targetType: "Purchase",
    targetId: purchaseId,
    metadata: { documentId: document.id, title: document.title, amount, free: true },
    ip,
  });
}
