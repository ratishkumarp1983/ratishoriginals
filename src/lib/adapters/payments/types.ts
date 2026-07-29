/**
 * Payments adapter contract (Razorpay-shaped).
 *
 * All amounts are in the smallest currency unit (paise for INR, cents for
 * USD) to match Razorpay and avoid floating-point money bugs.
 *
 * The golden rule (SRS §7): access is granted ONLY after a server-side
 * verified webhook or a server-side signature check. Nothing the client sends
 * is trusted on its own.
 */
export interface CreateOrderInput {
  amountMinor: number;
  currency: string;
  receipt: string; // our internal reference, e.g. purchase id
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  amountMinor: number;
  currency: string;
  /** Key id the client checkout widget needs (public). */
  keyId: string;
}

export interface VerifySignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookVerifyInput {
  rawBody: string;
  signature: string;
}

export interface WebhookEvent {
  event: string; // e.g. "payment.captured"
  orderId?: string;
  paymentId?: string;
  raw: unknown;
}

export interface PaymentsAdapter {
  readonly name: string;
  readonly keyId: string;

  createOrder(input: CreateOrderInput): Promise<PaymentOrder>;

  /** Verify the checkout callback signature (order+payment). */
  verifyPaymentSignature(input: VerifySignatureInput): boolean;

  /** Verify a webhook payload against the webhook secret. */
  verifyWebhook(input: WebhookVerifyInput): WebhookEvent | null;
}
