import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { couponUpdateSchema } from "@/lib/validation/coupon";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json(
      { error: guard.error === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.error },
    );
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = couponUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let coupon;
  try {
    coupon = await prisma.coupon.update({ where: { id }, data: parsed.data });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    throw err;
  }

  await audit({
    action: "COUPON_UPDATE",
    actorId: guard.user.id,
    targetType: "Coupon",
    targetId: id,
    ip: clientIp(req.headers),
  });
  return NextResponse.json({ coupon });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json(
      { error: guard.error === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.error },
    );
  }
  const { id } = await params;

  let deleted;
  try {
    deleted = await prisma.coupon.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    throw err;
  }

  await audit({
    action: "COUPON_DELETE",
    actorId: guard.user.id,
    targetType: "Coupon",
    targetId: id,
    metadata: { code: deleted.code },
    ip: clientIp(req.headers),
  });
  return NextResponse.json({ ok: true });
}
