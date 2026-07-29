import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createOrder, CheckoutError } from "@/lib/purchases";
import { checkoutSchema } from "@/lib/validation/checkout";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Create a payment order (or grant a free title) for the current user. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const ip = clientIp(req.headers);
  const limited = await rateLimit(`checkout:${user.id}`, 15, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: parsed.data.documentId },
    select: { id: true, slug: true, title: true, price: true, currency: true, status: true },
  });
  if (!doc || doc.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Title not available" }, { status: 404 });
  }

  try {
    const result = await createOrder({
      user,
      document: doc,
      couponCode: parsed.data.couponCode || null,
      ip,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[checkout] failed", err);
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}
