import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/adapters/storage";
import { coverContentType } from "@/lib/documents/keys";

/**
 * Public cover image. Covers are marketing assets shown on the storefront, so
 * this route is intentionally unauthenticated — but it only ever serves the
 * cover, never the document body. The original/sample PDFs are served
 * elsewhere behind entitlement checks.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { coverImage: true },
  });
  if (!doc?.coverImage) {
    return NextResponse.json({ error: "No cover" }, { status: 404 });
  }

  try {
    const bytes = await storage().get(doc.coverImage);
    const ext = doc.coverImage.split(".").pop() ?? "jpg";
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": coverContentType(ext),
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export const runtime = "nodejs";
