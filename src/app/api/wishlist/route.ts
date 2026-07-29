import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * Wishlist (SRS FR-13). A signed-in reader saves or removes a published title.
 * Both verbs are idempotent so repeated taps are harmless.
 */
async function documentId(req: Request): Promise<string | null> {
  const body = (await req.json().catch(() => null)) as { documentId?: unknown } | null;
  return typeof body?.documentId === "string" && body.documentId ? body.documentId : null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const id = await documentId(req);
  if (!id) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!doc || (doc.status !== "PUBLISHED" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.wishlist.create({ data: { userId: user.id, documentId: doc.id } });
  } catch (err) {
    // Already saved (unique userId+documentId). Idempotent success.
    if ((err as { code?: string }).code !== "P2002") throw err;
  }
  return NextResponse.json({ ok: true, wishlisted: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const id = await documentId(req);
  if (!id) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.wishlist.deleteMany({ where: { userId: user.id, documentId: id } });
  return NextResponse.json({ ok: true, wishlisted: false });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
