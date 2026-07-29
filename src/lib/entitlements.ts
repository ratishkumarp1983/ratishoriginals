import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";

/**
 * Read entitlement (SRS FR-5/FR-6). A user may read the FULL document if they
 * are an admin, own a completed purchase, or have an active membership that
 * includes the document. Sample reading is open to everyone and is handled by
 * the caller, not here.
 *
 * Purchases and memberships do not exist until Steps 5/6; this check already
 * queries them, so it starts granting access the moment those rows appear.
 */
export type ReadReason = "admin" | "purchase" | "membership";

export interface ReadAccess {
  canReadFull: boolean;
  reason: ReadReason | null;
}

export async function getReadAccess(
  user: SessionUser | null,
  documentId: string,
): Promise<ReadAccess> {
  if (!user) return { canReadFull: false, reason: null };

  if (user.role === "ADMIN") return { canReadFull: true, reason: "admin" };

  const purchase = await prisma.purchase.findFirst({
    where: { userId: user.id, documentId, status: "COMPLETED" },
    select: { id: true },
  });
  if (purchase) return { canReadFull: true, reason: "purchase" };

  const membership = await prisma.userMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      membership: { documents: { some: { documentId } } },
    },
    select: { id: true },
  });
  if (membership) return { canReadFull: true, reason: "membership" };

  return { canReadFull: false, reason: null };
}
