import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { validateCoupon } from "@/lib/coupons";
import { applyDiscount } from "@/lib/pricing";
import { couponPreviewSchema } from "@/lib/validation/checkout";
import { rateLimit } from "@/lib/rate-limit";

/** Preview a coupon's discount for the checkout UI. Auth required. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const limited = await rateLimit(`coupon:${user.id}`, 20, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = couponPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: parsed.data.documentId },
    select: { id: true, price: true, currency: true, status: true },
  });
  if (!doc || doc.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Title not available" }, { status: 404 });
  }

  const check = await validateCoupon({
    code: parsed.data.code,
    userId: user.id,
    documentId: doc.id,
    isMember: user.membershipStatus === "ACTIVE",
  });
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error });

  const base = Number(doc.price.toString());
  const { discountAmount, finalAmount } = applyDiscount(
    base,
    check.coupon.discountType,
    Number(check.coupon.discountValue.toString()),
  );

  return NextResponse.json({
    ok: true,
    code: check.coupon.code,
    discountAmount,
    finalAmount,
    currency: doc.currency,
  });
}
