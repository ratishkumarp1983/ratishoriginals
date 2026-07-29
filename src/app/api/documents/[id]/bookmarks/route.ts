import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getReadAccess } from "@/lib/entitlements";

/**
 * Per-title bookmarks (SRS §6 reader feature). A reader with full access saves
 * named jump points at a page. Listing and deleting are scoped to the caller's
 * own bookmarks; creating clamps the page to the document's range.
 */
const LABEL_MAX = 80;

async function loadDoc(id: string) {
  return prisma.document.findUnique({
    where: { id },
    select: { id: true, pageCount: true },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id, documentId: id },
    orderBy: { page: "asc" },
    select: { id: true, page: true, label: true },
  });
  return NextResponse.json({ bookmarks });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { page?: unknown; label?: unknown }
    | null;
  const rawPage = body?.page;
  if (typeof rawPage !== "number" || !Number.isFinite(rawPage)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const label =
    typeof body?.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, LABEL_MAX)
      : null;

  const doc = await loadDoc(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await getReadAccess(user, doc.id);
  if (!access.canReadFull) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  const total = doc.pageCount && doc.pageCount > 0 ? doc.pageCount : null;
  const page = Math.max(1, Math.min(total ?? Math.floor(rawPage), Math.floor(rawPage)));

  const bookmark = await prisma.bookmark.upsert({
    where: { userId_documentId_page: { userId: user.id, documentId: doc.id, page } },
    create: { userId: user.id, documentId: doc.id, page, label },
    update: { label },
    select: { id: true, page: true, label: true },
  });
  return NextResponse.json({ ok: true, bookmark });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { bookmarkId?: unknown } | null;
  const bookmarkId = typeof body?.bookmarkId === "string" ? body.bookmarkId : null;
  if (!bookmarkId) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Scope the delete to the caller and this document so ids cannot be crossed.
  await prisma.bookmark.deleteMany({
    where: { id: bookmarkId, userId: user.id, documentId: id },
  });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
