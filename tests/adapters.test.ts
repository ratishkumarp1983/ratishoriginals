import { describe, expect, it } from "vitest";
import {
  mockSignature,
  mockWebhookSignature,
  MockPaymentsAdapter,
} from "@/lib/adapters/payments/mock";
import { signToken, verifyToken } from "@/lib/adapters/storage/local";

describe("MockPaymentsAdapter", () => {
  const gw = new MockPaymentsAdapter();

  it("creates an order carrying the requested amount and currency", async () => {
    const order = await gw.createOrder({
      amountMinor: 51000,
      currency: "INR",
      receipt: "purchase_1",
    });
    expect(order.orderId).toMatch(/^order_mock_/);
    expect(order.amountMinor).toBe(51000);
    expect(order.currency).toBe("INR");
  });

  it("accepts a correctly-signed payment and rejects a forged one", () => {
    const orderId = "order_mock_abc";
    const paymentId = "pay_mock_xyz";
    const good = mockSignature(orderId, paymentId);
    expect(
      gw.verifyPaymentSignature({ orderId, paymentId, signature: good }),
    ).toBe(true);
    expect(
      gw.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: "0".repeat(good.length),
      }),
    ).toBe(false);
  });

  it("verifies a webhook only with the correct signature", () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: { entity: { id: "pay_1", order_id: "order_mock_1" } },
      },
    });
    const sig = mockWebhookSignature(body);
    const evt = gw.verifyWebhook({ rawBody: body, signature: sig });
    expect(evt?.event).toBe("payment.captured");
    expect(evt?.orderId).toBe("order_mock_1");
    expect(
      gw.verifyWebhook({ rawBody: body, signature: "deadbeef" }),
    ).toBeNull();
  });
});

describe("local storage signed-url token", () => {
  it("verifies a fresh token and rejects an expired one", () => {
    const key = "documents/doc1/original.pdf";
    const future = Date.now() + 30_000;
    const sig = signToken(key, future);
    expect(verifyToken(key, future, sig)).toBe(true);

    const past = Date.now() - 1_000;
    const expiredSig = signToken(key, past);
    expect(verifyToken(key, past, expiredSig)).toBe(false);
  });

  it("rejects a tampered key", () => {
    const future = Date.now() + 30_000;
    const sig = signToken("documents/a.pdf", future);
    expect(verifyToken("documents/b.pdf", future, sig)).toBe(false);
  });
});
