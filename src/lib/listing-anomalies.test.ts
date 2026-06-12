import { describe, expect, it } from "vitest";
import {
  duplicateKey,
  isStaleListing,
  priceDropFraction,
} from "./listing-anomalies";

const now = new Date("2026-06-12T00:00:00Z");

describe("priceDropFraction", () => {
  it("detects a drop against the highest in-window price", () => {
    const history = [
      { price: 400_000, observedAt: new Date("2026-06-08") },
      { price: 380_000, observedAt: new Date("2026-06-10") },
    ];
    expect(priceDropFraction(history, 320_000, now)).toBeCloseTo(0.2, 5);
  });

  it("ignores prices outside the window and non-drops", () => {
    const old = [{ price: 500_000, observedAt: new Date("2026-05-01") }];
    expect(priceDropFraction(old, 320_000, now)).toBe(0);

    const rising = [{ price: 300_000, observedAt: new Date("2026-06-10") }];
    expect(priceDropFraction(rising, 320_000, now)).toBe(0);

    expect(priceDropFraction([], 320_000, now)).toBe(0);
  });
});

describe("isStaleListing", () => {
  it("flags only long-running active listings", () => {
    expect(isStaleListing(181, "Active")).toBe(true);
    expect(isStaleListing(180, "Active")).toBe(false);
    expect(isStaleListing(400, "Sold")).toBe(false);
  });
});

describe("duplicateKey", () => {
  it("normalizes case and whitespace", () => {
    expect(duplicateKey(" 123 Main St ", "Orlando")).toBe("123 main st|orlando");
  });
});
