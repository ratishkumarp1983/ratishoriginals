import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { membershipUpdateSchema } from "@/lib/validation/membership";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

function forbid(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "Unauthorized" : "Forbidden" },
    { status },
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) return forbid(guard.error);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = membershipUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { documentIds, ...fields } = parsed.data;

  const existing = await prisma.membership.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Replace member-only document assignments when provided.
  if (documentIds) {
    const valid = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true },
    });
    const validIds = new Set(valid.map((d) => d.id));
    await prisma.$transaction([
      prisma.membershipDocument.deleteMany({ where: { membershipId: id } }),
      prisma.membershipDocument.createMany({
        data: documentIds
          .filter((d) => validIds.has(d))
          .map((documentId) => ({ membershipId: id, documentId })),
      }),
    ]);
  }

  const membership = await prisma.membership.update({ where: { id }, data: fields });

  await audit({
    action: "MEMBERSHIP_PLAN_UPDATE",
    actorId: guard.user.id,
    targetType: "Membership",
    targetId: id,
    ip: clientIp(req.headers),
  });
  return NextResponse.json({ membership });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) return forbid(guard.error);
  const { id } = await params;

  const subscribers = await prisma.userMembership.count({ where: { membershipId: id } });
  if (subscribers > 0) {
    return NextResponse.json(
      { error: "Cannot delete a plan that has subscribers. Deactivate it instead." },
      { status: 409 },
    );
  }

  const deleted = await prisma.membership.delete({ where: { id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  await audit({
    action: "MEMBERSHIP_PLAN_DELETE",
    actorId: guard.user.id,
    targetType: "Membership",
    targetId: id,
    metadata: { name: deleted.name },
    ip: clientIp(req.headers),
  });
  return NextResponse.json({ ok: true });
}
