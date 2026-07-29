import { env } from "@/lib/env";
import { MockPaymentsAdapter } from "./mock";
import { RazorpayPaymentsAdapter } from "./razorpay";
import type { PaymentsAdapter } from "./types";

let instance: PaymentsAdapter | undefined;

/** The active payments adapter, chosen by PAYMENTS_DRIVER. Singleton. */
export function payments(): PaymentsAdapter {
  if (!instance) {
    instance =
      env.PAYMENTS_DRIVER === "razorpay"
        ? new RazorpayPaymentsAdapter()
        : new MockPaymentsAdapter();
  }
  return instance;
}

export type {
  PaymentsAdapter,
  PaymentOrder,
  CreateOrderInput,
  WebhookEvent,
} from "./types";
