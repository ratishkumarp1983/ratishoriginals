import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth-helpers";
import { payments } from "@/lib/adapters/payments";
import { mockSignature } from "@/lib/adapters/payments/mock";
import { completeOrder, findOrderOwner } from "@/lib/orders";

/**
 * Dev-only: simulate a successful capture on the mock gateway. It generates a
 * payment id + a valid mock signature and runs the SAME verify-and-complete
 * path a real Razorpay callback would, so the checkout flow is exercised
 * end-to-end without a real payment. Returns 404 under the real gateway.
 */
export async function POST(req: Request) {
  if (env.PAYMENTS_DRIVER !== "mock") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const ownerId = await findOrderOwner(orderId);
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const paymentId = `pay_mock_${randomBytes(10).toString("hex")}`;
  const signature = mockSignature(orderId, paymentId);
  if (!payments().verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: "Verification failed." }, { status: 400 });
  }

  await completeOrder(orderId, paymentId);
  return NextResponse.json({ ok: true });
}
