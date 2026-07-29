import { describe, expect, it } from "vitest";
import { computeProgress } from "@/lib/reading";

describe("computeProgress", () => {
  it("derives completion from the page within a known range", () => {
    expect(computeProgress(5, 12)).toEqual({ page: 5, completionPercent: 42 });
  });

  it("clamps a page beyond the end to the last page and 100%", () => {
    expect(computeProgress(9999, 12)).toEqual({ page: 12, completionPercent: 100 });
  });

  it("clamps a non-positive page up to page 1", () => {
    expect(computeProgress(0, 12)).toEqual({ page: 1, completionPercent: 8 });
    expect(computeProgress(-5, 20)).toEqual({ page: 1, completionPercent: 5 });
  });

  it("floors a fractional page", () => {
    expect(computeProgress(3.9, 20)).toEqual({ page: 3, completionPercent: 15 });
  });

  it("reports 0% when the page count is unknown", () => {
    expect(computeProgress(7, null)).toEqual({ page: 7, completionPercent: 0 });
    expect(computeProgress(7, 0)).toEqual({ page: 7, completionPercent: 0 });
  });
});
