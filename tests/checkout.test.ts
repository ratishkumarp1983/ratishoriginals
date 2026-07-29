import { describe, expect, it } from "vitest";
import { applyDiscount, toMinor, toMajor } from "@/lib/pricing";
import { normalizeCode } from "@/lib/coupons";

describe("applyDiscount", () => {
  it("applies a percentage discount and rounds to 2dp", () => {
    const r = applyDiscount(199, "PERCENTAGE", 10);
    expect(r.discountAmount).toBe(19.9);
    expect(r.finalAmount).toBe(179.1);
  });

  it("applies a fixed discount", () => {
    const r = applyDiscount(199, "FIXED", 50);
    expect(r.discountAmount).toBe(50);
    expect(r.finalAmount).toBe(149);
  });

  it("never discounts below zero (fixed larger than price)", () => {
    const r = applyDiscount(100, "FIXED", 250);
    expect(r.discountAmount).toBe(100);
    expect(r.finalAmount).toBe(0);
  });

  it("caps a 100% percentage at the full price", () => {
    const r = applyDiscount(80, "PERCENTAGE", 100);
    expect(r.finalAmount).toBe(0);
  });
});

describe("money unit conversion", () => {
  it("converts major to minor and back without drift", () => {
    expect(toMinor(179.1)).toBe(17910);
    expect(toMajor(17910)).toBe(179.1);
    expect(toMinor(0.1 + 0.2)).toBe(30); // no float artifacts
  });
});

describe("normalizeCode", () => {
  it("uppercases and trims", () => {
    expect(normalizeCode("  welcome10 ")).toBe("WELCOME10");
  });
});
