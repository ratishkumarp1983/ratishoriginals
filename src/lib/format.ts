/** Format a money amount (Decimal-like or number) in the given currency. */
export function formatPrice(
  price: { toString(): string } | number,
  currency: string,
): string {
  const n = typeof price === "number" ? price : Number(price.toString());
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** True when the amount is zero (a free document). */
export function isFree(price: { toString(): string } | number): boolean {
  const n = typeof price === "number" ? price : Number(price.toString());
  return n <= 0;
}
