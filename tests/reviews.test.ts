import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/reviews";

describe("summarize", () => {
  it("computes average (1dp) and per-star distribution", () => {
    const s = summarize([5, 4, 4, 3, 5]);
    expect(s.count).toBe(5);
    expect(s.average).toBe(4.2);
    expect(s.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 });
  });

  it("rounds the average to one decimal place", () => {
    expect(summarize([4, 5, 5]).average).toBe(4.7); // 14/3 = 4.666...
  });

  it("is all zeros with no ratings", () => {
    const s = summarize([]);
    expect(s).toEqual({
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });
});
