import type { DiscountType } from "@prisma/client";

/**
 * Money math for checkout. All base/final amounts are in major units (rupees)
 * with 2 decimals; `toMinor` converts to the smallest unit (paise) at the
 * payment boundary, which is what Razorpay expects.
 */
export interface DiscountResult {
  discountAmount: number;
  finalAmount: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function applyDiscount(
  base: number,
  type: DiscountType,
  value: number,
): DiscountResult {
  let discount = type === "PERCENTAGE" ? (base * value) / 100 : value;
  discount = Math.max(0, Math.min(round2(discount), base));
  return { discountAmount: discount, finalAmount: round2(base - discount) };
}

/** Convert major units to integer minor units (paise/cents). */
export const toMinor = (major: number): number => Math.round(major * 100);

/** Convert integer minor units back to major units. */
export const toMajor = (minor: number): number => round2(minor / 100);
