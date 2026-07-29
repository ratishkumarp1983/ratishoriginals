import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { metadataCreateSchema } from "@/lib/validation/metadata";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

/** List metadata definitions (FR-3). */
export async function GET() {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }
  const fields = await prisma.metadataDefinition.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ fields });
}

/** Create a metadata definition (FR-3: no code change to add a field). */
export async function POST(req: Request) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.error });
  }

  const body = await req.json().catch(() => null);
  const parsed = metadataCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const key =
    parsed.data.key ??
    parsed.data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    return NextResponse.json(
      { error: "Could not derive a valid key from the name; set one explicitly." },
      { status: 400 },
    );
  }

  const exists = await prisma.metadataDefinition.findUnique({ where: { key } });
  if (exists) {
    return NextResponse.json(
      { error: `A field with key "${key}" already exists.` },
      { status: 409 },
    );
  }

  const field = await prisma.metadataDefinition.create({
    data: {
      name: parsed.data.name,
      key,
      type: parsed.data.type,
      displayOrder: parsed.data.displayOrder,
      active: parsed.data.active,
    },
  });

  await audit({
    action: "METADATA_CREATE",
    actorId: guard.user.id,
    targetType: "MetadataDefinition",
    targetId: field.id,
    metadata: { key: field.key },
    ip: clientIp(req.headers),
  });

  return NextResponse.json({ field }, { status: 201 });
}
