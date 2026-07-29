import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getReadAccess } from "@/lib/entitlements";
import { computeProgress } from "@/lib/reading";

/**
 * Save reading progress (SRS FR-10). Only a reader with full access may record
 * progress, and the page is clamped to the document's real range so the stored
 * "resume" point can never be forced out of bounds. completionPercent is derived
 * server-side from the page, never trusted from the client.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { page?: unknown } | null;
  const rawPage = body?.page;
  if (typeof rawPage !== "number" || !Number.isFinite(rawPage)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, pageCount: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await getReadAccess(user, doc.id);
  if (!access.canReadFull) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  const { page, completionPercent } = computeProgress(rawPage, doc.pageCount);

  await prisma.readingProgress.upsert({
    where: { userId_documentId: { userId: user.id, documentId: doc.id } },
    create: { userId: user.id, documentId: doc.id, lastPage: page, completionPercent },
    update: { lastPage: page, completionPercent },
  });

  return NextResponse.json({ ok: true, page, completionPercent });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
