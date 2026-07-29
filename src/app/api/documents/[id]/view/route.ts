import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Record a storefront view (SRS FR-14). Fired once by the book page on mount, so
 * link prefetches (which render on the server but never run client effects) do
 * not inflate the count. Only published titles count, and admin previews are
 * excluded so the funnel is not skewed by the author's own browsing. A light
 * per-IP+title cap blunts scripted inflation. Always acks so the beacon never
 * surfaces an error to the reader.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return NextResponse.json({ ok: true, counted: false });

  const ip = clientIp(req.headers);
  const limited = await rateLimit(`view:${ip}:${id}`, 10, 60_000);
  if (!limited.success) return NextResponse.json({ ok: true, counted: false });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!doc || doc.status !== "PUBLISHED") {
    return NextResponse.json({ ok: true, counted: false });
  }

  await prisma.documentView.create({ data: { documentId: doc.id } });
  return NextResponse.json({ ok: true, counted: true });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
