import { createHmac } from "node:crypto";
import Razorpay from "razorpay";
import { env } from "@/lib/env";
import type {
  CreateOrderInput,
  PaymentOrder,
  PaymentsAdapter,
  VerifySignatureInput,
  WebhookEvent,
  WebhookVerifyInput,
} from "./types";

/**
 * Live/test Razorpay adapter. Selected when PAYMENTS_DRIVER=razorpay.
 * Webhook verification is mandatory and done here server-side (SRS §7).
 */
export class RazorpayPaymentsAdapter implements PaymentsAdapter {
  readonly name = "razorpay";
  readonly keyId: string;
  private client: Razorpay;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "PAYMENTS_DRIVER=razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET",
      );
    }
    this.keyId = env.RAZORPAY_KEY_ID;
    this.keySecret = env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    const order = await this.client.orders.create({
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
    return {
      orderId: order.id,
      amountMinor: Number(order.amount),
      currency: order.currency,
      keyId: this.keyId,
    };
  }

  verifyPaymentSignature(input: VerifySignatureInput): boolean {
    const expected = createHmac("sha256", this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    return timingSafeEqualHex(expected, input.signature);
  }

  verifyWebhook(input: WebhookVerifyInput): WebhookEvent | null {
    if (!this.webhookSecret) return null;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(input.rawBody)
      .digest("hex");
    if (!timingSafeEqualHex(expected, input.signature)) return null;
    try {
      const parsed = JSON.parse(input.rawBody) as {
        event: string;
        payload?: {
          payment?: { entity?: { id?: string; order_id?: string } };
        };
      };
      return {
        event: parsed.event,
        orderId: parsed.payload?.payment?.entity?.order_id,
        paymentId: parsed.payload?.payment?.entity?.id,
        raw: parsed,
      };
    } catch {
      return null;
    }
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
