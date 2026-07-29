import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { payments } from "@/lib/adapters/payments";
import { completeOrder } from "@/lib/orders";
import { verifySchema } from "@/lib/validation/checkout";

/**
 * Client callback after the payment widget succeeds. The signature is verified
 * server-side (SRS §7: no client-side trust) before access is granted. The
 * webhook is the authoritative path; this endpoint gives the buyer an instant
 * result, and completion is idempotent across both.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const valid = payments().verifyPaymentSignature({
    orderId: parsed.data.orderId,
    paymentId: parsed.data.paymentId,
    signature: parsed.data.signature,
  });
  if (!valid) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const outcome = await completeOrder(
    parsed.data.orderId,
    parsed.data.paymentId,
  );
  if (outcome === "unknown") {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
