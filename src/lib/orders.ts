import { prisma } from "@/lib/prisma";
import { completePurchaseByOrder } from "@/lib/purchases";
import { completeMembershipByOrder } from "@/lib/membership";

/**
 * A payment order maps to either a document purchase or a membership
 * subscription. Completion tries the purchase path first, then membership, so
 * the verify endpoint, the webhook, and the mock gateway all share one
 * idempotent entry point.
 */
export async function completeOrder(
  orderId: string,
  paymentId: string,
): Promise<"completed" | "already" | "unknown"> {
  const asPurchase = await completePurchaseByOrder(orderId, paymentId);
  if (asPurchase !== "unknown") return asPurchase;
  return completeMembershipByOrder(orderId, paymentId);
}

/** The user who owns an order (purchase or membership), for ownership checks. */
export async function findOrderOwner(orderId: string): Promise<string | null> {
  const purchase = await prisma.purchase.findUnique({
    where: { razorpayOrderId: orderId },
    select: { userId: true },
  });
  if (purchase) return purchase.userId;
  const um = await prisma.userMembership.findUnique({
    where: { razorpayOrderId: orderId },
    select: { userId: true },
  });
  return um?.userId ?? null;
}
