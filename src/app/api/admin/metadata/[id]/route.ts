import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { metadataUpdateSchema } from "@/lib/validation/metadata";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = metadataUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const field = await prisma.metadataDefinition
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);
  if (!field) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  await audit({
    action: "METADATA_UPDATE",
    actorId: guard.user.id,
    targetType: "MetadataDefinition",
    targetId: id,
    ip: clientIp(req.headers),
  });

  return NextResponse.json({ field });
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

  // Deleting a definition cascades its per-document values (schema onDelete).
  const deleted = await prisma.metadataDefinition
    .delete({ where: { id } })
    .catch(() => null);
  if (!deleted) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  await audit({
    action: "METADATA_DELETE",
    actorId: guard.user.id,
    targetType: "MetadataDefinition",
    targetId: id,
    metadata: { key: deleted.key },
    ip: clientIp(req.headers),
  });

  return NextResponse.json({ ok: true });
}
