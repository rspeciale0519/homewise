import { describe, expect, it } from "vitest";
import { calculateMedian, calculateSaleToListRatio } from "./market-stats";

describe("calculateMedian", () => {
  it("returns the middle value for an odd set", () => {
    expect(calculateMedian([300_000, 100_000, 200_000])).toBe(200_000);
  });

  it("averages both middle values for an even set", () => {
    expect(calculateMedian([400_000, 100_000, 300_000, 200_000])).toBe(250_000);
  });

  it("returns zero for an empty set", () => {
    expect(calculateMedian([])).toBe(0);
  });
});

describe("calculateSaleToListRatio", () => {
  it("compares sold close price with sold list price", () => {
    expect(calculateSaleToListRatio(490_000, 500_000)).toBe(0.98);
  });

  it("returns zero when either price is unavailable", () => {
    expect(calculateSaleToListRatio(0, 500_000)).toBe(0);
    expect(calculateSaleToListRatio(490_000, 0)).toBe(0);
  });
});
