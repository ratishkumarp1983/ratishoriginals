import { describe, expect, it } from "vitest";
import { conversionRate, rangeStart } from "@/lib/analytics";

describe("conversionRate", () => {
  it("computes purchases over views as a percentage", () => {
    expect(conversionRate(5, 100)).toBe(5);
    expect(conversionRate(1, 4)).toBe(25);
  });

  it("returns null when there are no views (never divides by zero)", () => {
    expect(conversionRate(0, 0)).toBeNull();
    expect(conversionRate(3, 0)).toBeNull();
  });

  it("is 0 when there are views but no purchases", () => {
    expect(conversionRate(0, 50)).toBe(0);
  });
});

describe("rangeStart", () => {
  it("is null for all-time", () => {
    expect(rangeStart("all")).toBeNull();
  });

  it("is ~30 days ago for the 30-day range", () => {
    const start = rangeStart("30d");
    expect(start).toBeInstanceOf(Date);
    const days = (Date.now() - (start as Date).getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });
});
