import { NextResponse } from "next/server";
import type { VoteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * Helpful / not-helpful votes on a review (SRS FR-12). One vote per reader per
 * review (unique), togglable: sending the same vote again, or `null`, clears it.
 * A reader cannot vote on their own review. Counts are recomputed from the vote
 * rows so they can never drift.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { voteType?: unknown } | null;
  const raw = body?.voteType;
  let voteType: VoteType | null;
  if (raw === "HELPFUL" || raw === "NOT_HELPFUL") voteType = raw;
  else if (raw == null) voteType = null;
  else return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, isVisible: true },
  });
  if (!review || !review.isVisible) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (review.userId === user.id) {
    return NextResponse.json({ error: "You cannot vote on your own review." }, { status: 400 });
  }

  const key = { reviewId_userId: { reviewId, userId: user.id } };
  const current = await prisma.reviewVote.findUnique({ where: key, select: { voteType: true } });

  // Toggle off when clearing or repeating the same vote; otherwise set it.
  if (voteType === null || current?.voteType === voteType) {
    await prisma.reviewVote.deleteMany({ where: { reviewId, userId: user.id } });
  } else if (current) {
    await prisma.reviewVote.update({ where: key, data: { voteType } });
  } else {
    await prisma.reviewVote.create({ data: { reviewId, userId: user.id, voteType } });
  }

  const [helpfulCount, notHelpfulCount, mine] = await Promise.all([
    prisma.reviewVote.count({ where: { reviewId, voteType: "HELPFUL" } }),
    prisma.reviewVote.count({ where: { reviewId, voteType: "NOT_HELPFUL" } }),
    prisma.reviewVote.findUnique({ where: key, select: { voteType: true } }),
  ]);
  await prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount, notHelpfulCount },
  });

  return NextResponse.json({
    ok: true,
    helpfulCount,
    notHelpfulCount,
    viewerVote: mine?.voteType ?? null,
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
