import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { parseDocumentForm, FormError } from "@/lib/documents/form";
import { updateDocument, deleteDocument, UploadError } from "@/lib/documents/service";
import { clientIp } from "@/lib/rate-limit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: { metadata: true },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }
  const { id } = await params;

  let parsed;
  try {
    parsed = await parseDocumentForm(req);
  } catch (err) {
    if (err instanceof FormError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Malformed upload" }, { status: 400 });
  }

  try {
    const doc = await updateDocument({
      id,
      core: parsed.core,
      metadata: parsed.metadata,
      file: parsed.file,
      cover: parsed.cover,
      actorId: guard.user.id,
      ip: clientIp(req.headers),
    });
    return NextResponse.json({ id: doc.id, slug: doc.slug });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[documents] update failed", err);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }
  const { id } = await params;
  try {
    await deleteDocument(id, guard.user.id, clientIp(req.headers));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[documents] delete failed", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
