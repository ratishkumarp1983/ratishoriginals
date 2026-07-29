import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

/**
 * Admin review moderation (SRS FR-12): hide, restore, pin, unpin, publicly
 * reply, and delete. Admin-only; every action is audited.
 */
const REPLY_MAX = 2000;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const auth = await getAdminForApi();
  if ("error" in auth) return NextResponse.json({ error: "Forbidden" }, { status: auth.error });
  const { reviewId } = await params;

  const body = (await req.json().catch(() => null)) as
    | { action?: unknown; reply?: unknown }
    | null;
  const action = body?.action;

  const exists = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let data: Record<string, unknown>;
  switch (action) {
    case "hide":
      data = { isVisible: false };
      break;
    case "restore":
      data = { isVisible: true };
      break;
    case "pin":
      data = { isPinned: true };
      break;
    case "unpin":
      data = { isPinned: false };
      break;
    case "reply": {
      const reply = typeof body?.reply === "string" ? body.reply.trim() : "";
      data = reply
        ? { adminReply: reply.slice(0, REPLY_MAX), adminReplyAt: new Date() }
        : { adminReply: null, adminReplyAt: null };
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await prisma.review.update({ where: { id: reviewId }, data });
  await audit({
    action: "REVIEW_MODERATE",
    actorId: auth.user.id,
    targetType: "Review",
    targetId: reviewId,
    metadata: { moderation: action },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const auth = await getAdminForApi();
  if ("error" in auth) return NextResponse.json({ error: "Forbidden" }, { status: auth.error });
  const { reviewId } = await params;

  const deleted = await prisma.review.deleteMany({ where: { id: reviewId } });
  if (deleted.count > 0) {
    await audit({
      action: "REVIEW_DELETE_ADMIN",
      actorId: auth.user.id,
      targetType: "Review",
      targetId: reviewId,
    });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
