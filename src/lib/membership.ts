import type { Membership, UserMembership } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/adapters/payments";
import { toMinor } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth-helpers";

export class SubscriptionError extends Error {}

const addDays = (from: Date, days: number) =>
  new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * The user's current active membership (status ACTIVE and not expired), or
 * null. Side effect: lazily downgrades lapsed rows to EXPIRED and keeps the
 * denormalized User.membershipStatus in sync, so status is always correct on
 * read without a scheduled job.
 */
export async function getActiveMembership(
  userId: string,
): Promise<(UserMembership & { membership: Membership }) | null> {
  const now = new Date();

  const active = await prisma.userMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { expiresAt: "desc" },
    include: { membership: true },
  });

  if (active) {
    await syncUserStatus(userId, "ACTIVE");
    return active;
  }

  const lapsed = await prisma.userMembership.updateMany({
    where: { userId, status: "ACTIVE", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  if (lapsed.count > 0) await syncUserStatus(userId, "EXPIRED");
  return null;
}

export async function isActiveMember(userId: string): Promise<boolean> {
  return (await getActiveMembership(userId)) !== null;
}

async function syncUserStatus(
  userId: string,
  status: "ACTIVE" | "EXPIRED" | "NONE" | "PENDING",
) {
  await prisma.user.updateMany({
    where: { id: userId, membershipStatus: { not: status } },
    data: { membershipStatus: status },
  });
}

export type SubscribeResult =
  | { kind: "activated" }
  | {
      kind: "order";
      userMembershipId: string;
      orderId: string;
      amountMinor: number;
      currency: string;
      keyId: string;
      driver: string;
    };

/** Start a subscription: activate immediately if free, else open an order. */
export async function createSubscriptionOrder(args: {
  user: SessionUser;
  membership: Membership;
}): Promise<SubscribeResult> {
  const { user, membership } = args;
  if (!membership.active) {
    throw new SubscriptionError("This plan is not available.");
  }

  const price = Number(membership.price.toString());

  if (price <= 0) {
    const um = await prisma.userMembership.create({
      data: { userId: user.id, membershipId: membership.id, status: "PENDING" },
    });
    await activate(um.id, membership.durationDays, user.id, null, price);
    return { kind: "activated" };
  }

  const um = await prisma.userMembership.create({
    data: { userId: user.id, membershipId: membership.id, status: "PENDING" },
  });

  const gateway = payments();
  const order = await gateway.createOrder({
    amountMinor: toMinor(price),
    currency: membership.currency,
    receipt: um.id,
    notes: { userMembershipId: um.id, membershipId: membership.id, kind: "membership" },
  });

  await prisma.userMembership.update({
    where: { id: um.id },
    data: { razorpayOrderId: order.orderId },
  });

  return {
    kind: "order",
    userMembershipId: um.id,
    orderId: order.orderId,
    amountMinor: order.amountMinor,
    currency: order.currency,
    keyId: order.keyId,
    driver: gateway.name,
  };
}

/**
 * Complete a subscription from its order id. Idempotent. The new period is
 * appended to any remaining time so an early renewal never loses days.
 */
export async function completeMembershipByOrder(
  orderId: string,
  paymentId: string,
): Promise<"completed" | "already" | "unknown"> {
  const um = await prisma.userMembership.findUnique({
    where: { razorpayOrderId: orderId },
    include: { membership: true },
  });
  if (!um) return "unknown";
  if (um.status === "ACTIVE") return "already";

  await activate(
    um.id,
    um.membership.durationDays,
    um.userId,
    paymentId,
    Number(um.membership.price.toString()),
  );
  return "completed";
}

async function activate(
  userMembershipId: string,
  durationDays: number,
  userId: string,
  paymentId: string | null,
  amount: number,
) {
  const now = new Date();

  const current = await prisma.userMembership.findFirst({
    where: { userId, status: "ACTIVE", expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  });
  const base = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  const expiresAt = addDays(base, durationDays);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.userMembership.updateMany({
      where: { id: userMembershipId, status: { not: "ACTIVE" } },
      data: { status: "ACTIVE", startedAt: now, expiresAt, razorpayPaymentId: paymentId, amount },
    });
    if (updated.count === 0) return; // lost the race
    await tx.user.update({
      where: { id: userId },
      data: { membershipStatus: "ACTIVE" },
    });
  });

  await audit({
    action: "MEMBERSHIP_ACTIVATE",
    actorId: userId,
    targetType: "UserMembership",
    targetId: userMembershipId,
    metadata: { expiresAt: expiresAt.toISOString(), paymentId },
  });
}
