import { NextResponse } from "next/server";
import { payments } from "@/lib/adapters/payments";
import { completePurchaseByOrder } from "@/lib/purchases";
import { audit } from "@/lib/audit";

/**
 * Razorpay webhook (SRS §7: webhook verification mandatory, no client trust).
 * The raw body is verified against the webhook secret, then payment.captured
 * completes the matching purchase. Completion is idempotent, so a webhook that
 * races the client callback is harmless.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-razorpay-signature") ??
    req.headers.get("x-webhook-signature") ??
    "";

  const event = payments().verifyWebhook({ rawBody, signature });
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    (event.event === "payment.captured" || event.event === "order.paid") &&
    event.orderId &&
    event.paymentId
  ) {
    const outcome = await completePurchaseByOrder(event.orderId, event.paymentId);
    await audit({
      action: "PAYMENT_WEBHOOK",
      targetType: "Purchase",
      targetId: event.orderId,
      metadata: { event: event.event, outcome },
    });
  }

  // Always ack a validly-signed webhook so the provider stops retrying.
  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
