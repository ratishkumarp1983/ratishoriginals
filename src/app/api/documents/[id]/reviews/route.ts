import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getReviewEligibility } from "@/lib/reviews";
import { reviewSchema } from "@/lib/validation/review";
import { audit } from "@/lib/audit";

/**
 * Create or update the caller's review of a title (SRS FR-12). One review per
 * reader per title (upsert). Only a verified reader (completed purchase or
 * active membership) may review; the verified badges are set from that access,
 * not the client. Every edit snapshots the prior version into ReviewEdit so the
 * edit history is auditable.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!doc || doc.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const eligibility = await getReviewEligibility(user.id, doc.id);
  if (!eligibility.canReview) {
    return NextResponse.json(
      { error: "Only readers who own or subscribe to this title can review it." },
      { status: 403 },
    );
  }

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { rating, title, review, containsSpoiler } = parsed.data;

  const key = { userId_documentId: { userId: user.id, documentId: doc.id } };
  const existing = await prisma.review.findUnique({
    where: key,
    select: { id: true, rating: true, title: true, review: true },
  });

  const data = {
    rating,
    title: title?.trim() || null,
    review: review.trim(),
    containsSpoiler: containsSpoiler ?? false,
    isVerifiedPurchase: eligibility.isVerifiedPurchase,
    isVerifiedMember: eligibility.isVerifiedMember,
    purchaseId: eligibility.purchaseId,
  };

  // Snapshot the prior version into ReviewEdit, then overwrite (the edit trail).
  const applyEdit = async (prev: {
    id: string;
    rating: number;
    title: string | null;
    review: string;
  }) => {
    await prisma.$transaction([
      prisma.reviewEdit.create({
        data: {
          reviewId: prev.id,
          previousRating: prev.rating,
          previousTitle: prev.title,
          previousReview: prev.review,
        },
      }),
      prisma.review.update({ where: { id: prev.id }, data }),
    ]);
    await audit({
      action: "REVIEW_EDIT",
      actorId: user.id,
      targetType: "Review",
      targetId: prev.id,
      metadata: { documentId: doc.id, rating },
    });
  };

  if (existing) {
    await applyEdit(existing);
    return NextResponse.json({ ok: true, updated: true });
  }

  try {
    const created = await prisma.review.create({
      data: { userId: user.id, documentId: doc.id, ...data },
      select: { id: true },
    });
    await audit({
      action: "REVIEW_CREATE",
      actorId: user.id,
      targetType: "Review",
      targetId: created.id,
      metadata: { documentId: doc.id, rating },
    });
    return NextResponse.json({ ok: true, updated: false });
  } catch (err) {
    // A concurrent first review won the unique (userId, documentId) race; apply
    // ours as an edit instead of surfacing a raw P2002 as a 500.
    if ((err as { code?: string }).code !== "P2002") throw err;
    const now = await prisma.review.findUnique({
      where: key,
      select: { id: true, rating: true, title: true, review: true },
    });
    if (!now) throw err;
    await applyEdit(now);
    return NextResponse.json({ ok: true, updated: true });
  }
}

/** Delete the caller's own review (its votes and edit history cascade). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const deleted = await prisma.review.deleteMany({
    where: { userId: user.id, documentId: id },
  });
  if (deleted.count > 0) {
    await audit({
      action: "REVIEW_DELETE",
      actorId: user.id,
      targetType: "Review",
      metadata: { documentId: id },
    });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
