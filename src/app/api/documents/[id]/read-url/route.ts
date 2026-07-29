import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/adapters/storage";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getReadAccess } from "@/lib/entitlements";
import { docKeys } from "@/lib/documents/keys";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Mints a short-lived signed URL for reading a document, checking entitlement
 * AT MINT TIME (the token itself is an unbound bearer credential, so the guard
 * has to live here):
 *   - mode=sample : the preview PDF (first N pages). Open to everyone, but only
 *     for PUBLISHED documents (admins may sample drafts too).
 *   - mode=full   : the original PDF. Requires a completed purchase, an active
 *     membership covering the document, or admin.
 *
 * The URL expires in STORAGE_SIGNED_URL_TTL seconds (default 30).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mode = new URL(req.url).searchParams.get("mode") === "full" ? "full" : "sample";

  const ip = clientIp(req.headers);
  const limited = await rateLimit(`read-url:${ip}`, 60, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, status: true, samplePages: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  // Only published documents are readable by non-admins (sample or full).
  if (doc.status !== "PUBLISHED" && !isAdmin) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  if (mode === "full") {
    const access = await getReadAccess(user, doc.id);
    if (!access.canReadFull) {
      return NextResponse.json(
        { error: "You do not have access to the full document." },
        { status: 403 },
      );
    }
  }

  const key = mode === "full" ? docKeys.original(doc.id) : docKeys.sample(doc.id);
  const signed = await storage().signedUrl(key);

  return NextResponse.json(
    { url: signed.url, expiresAt: signed.expiresAt, mode },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
