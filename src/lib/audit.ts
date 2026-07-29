import { prisma } from "@/lib/prisma";

/**
 * Append-only audit trail (SRS §8 "Audit Logs"). Records uploads, deletes,
 * purchases, membership changes, and admin actions. Best-effort: a logging
 * failure must never break the primary operation.
 */
export interface AuditInput {
  action: string;
  actorId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: (input.metadata as object) ?? undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", input.action, err);
  }
}
