import { z } from "zod";

export const checkoutSchema = z.object({
  documentId: z.string().uuid(),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const couponPreviewSchema = z.object({
  documentId: z.string().uuid(),
  code: z.string().trim().min(1).max(40),
});

export const verifySchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});
