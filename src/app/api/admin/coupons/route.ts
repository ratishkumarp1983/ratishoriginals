import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { couponCreateSchema } from "@/lib/validation/coupon";
import { normalizeCode } from "@/lib/coupons";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export async function GET() {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json(
      { error: guard.error === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.error },
    );
  }
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { document: { select: { title: true } } },
  });
  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  const guard = await getAdminForApi();
  if ("error" in guard) {
    return NextResponse.json(
      { error: guard.error === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.error },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = couponCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const code = normalizeCode(parsed.data.code);
  const exists = await prisma.coupon.findUnique({ where: { code } });
  if (exists) {
    return NextResponse.json({ error: "That code already exists." }, { status: 409 });
  }

  // A document-specific coupon must reference a real document.
  if (parsed.data.documentId) {
    const doc = await prisma.document.findUnique({
      where: { id: parsed.data.documentId },
      select: { id: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "That title does not exist." }, { status: 400 });
    }
  }

  let coupon;
  try {
    coupon = await prisma.coupon.create({
      data: {
        code,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        expiryDate: parsed.data.expiryDate,
        usageLimit: parsed.data.usageLimit,
        oneTimePerUser: parsed.data.oneTimePerUser,
        memberOnly: parsed.data.memberOnly,
        documentId: parsed.data.documentId,
        active: parsed.data.active,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "That code already exists." }, { status: 409 });
    }
    throw err;
  }

  await audit({
    action: "COUPON_CREATE",
    actorId: guard.user.id,
    targetType: "Coupon",
    targetId: coupon.id,
    metadata: { code: coupon.code },
    ip: clientIp(req.headers),
  });

  return NextResponse.json({ coupon }, { status: 201 });
}
