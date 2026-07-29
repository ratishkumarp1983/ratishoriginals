import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { parseDocumentForm, FormError } from "@/lib/documents/form";
import { createDocument, UploadError } from "@/lib/documents/service";
import { clientIp } from "@/lib/rate-limit";

/** List documents for the admin (all statuses). */
export async function GET() {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      price: true,
      currency: true,
      pageCount: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ documents });
}

/** Create a document via multipart upload (SRS FR-2 pipeline). */
export async function POST(req: Request) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }

  let parsed;
  try {
    parsed = await parseDocumentForm(req);
  } catch (err) {
    if (err instanceof FormError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Malformed upload" }, { status: 400 });
  }

  if (!parsed.file) {
    return NextResponse.json(
      { error: "A document file is required." },
      { status: 400 },
    );
  }

  try {
    const doc = await createDocument({
      core: parsed.core,
      metadata: parsed.metadata,
      file: parsed.file,
      cover: parsed.cover,
      actorId: guard.user.id,
      ip: clientIp(req.headers),
    });
    return NextResponse.json({ id: doc.id, slug: doc.slug }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[documents] create failed", err);
    return NextResponse.json(
      { error: "Failed to process the document." },
      { status: 500 },
    );
  }
}
