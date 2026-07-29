import { createHmac, randomBytes } from "node:crypto";
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
 * In-process payment gateway for development and tests. It mimics Razorpay's
 * signature scheme exactly (HMAC-SHA256), so the same server-side verification
 * code path runs in dev and prod - only the network call is faked.
 *
 * A test/dev checkout can compute a valid signature with `mockSignature()`,
 * which the mock's checkout page and the automated tests use to simulate a
 * successful capture.
 */
const MOCK_SECRET = "mock_secret";

export class MockPaymentsAdapter implements PaymentsAdapter {
  readonly name = "mock";
  readonly keyId = env.RAZORPAY_KEY_ID || "rzp_test_mock";

  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    const orderId = `order_mock_${randomBytes(10).toString("hex")}`;
    return {
      orderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      keyId: this.keyId,
    };
  }

  verifyPaymentSignature(input: VerifySignatureInput): boolean {
    const expected = mockSignature(input.orderId, input.paymentId);
    return timingSafeEqualHex(expected, input.signature);
  }

  verifyWebhook(input: WebhookVerifyInput): WebhookEvent | null {
    const expected = createHmac("sha256", MOCK_SECRET)
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

/** Compute the mock's payment signature the way Razorpay does: HMAC(order|payment). */
export function mockSignature(orderId: string, paymentId: string): string {
  return createHmac("sha256", MOCK_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

export function mockWebhookSignature(rawBody: string): string {
  return createHmac("sha256", MOCK_SECRET).update(rawBody).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
