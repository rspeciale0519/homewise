import { describe, expect, it } from "vitest";
import {
  parseProductSize,
  warningsForExpectedSize,
  type ArtworkInspection,
} from "./artwork-validator";

describe("parseProductSize", () => {
  it("returns null for empty / null / undefined", () => {
    expect(parseProductSize(null)).toBeNull();
    expect(parseProductSize(undefined)).toBeNull();
    expect(parseProductSize("")).toBeNull();
  });

  it("parses simple WxH formats", () => {
    expect(parseProductSize("6x9")).toEqual({ w: 6, h: 9 });
    expect(parseProductSize("5x7")).toEqual({ w: 5, h: 7 });
    expect(parseProductSize("4.25x11")).toEqual({ w: 4.25, h: 11 });
  });

  it("tolerates whitespace and capitalization", () => {
    expect(parseProductSize("6 x 9")).toEqual({ w: 6, h: 9 });
    expect(parseProductSize("8.5 X 11")).toEqual({ w: 8.5, h: 11 });
  });

  it("returns null for non-dimensional strings", () => {
    expect(parseProductSize("Standard letter")).toBeNull();
    expect(parseProductSize("#10 snap pack")).toBeNull();
  });
});

describe("warningsForExpectedSize", () => {
  function inspection(width?: number, height?: number): ArtworkInspection {
    return { widthInches: width, heightInches: height, warnings: [] };
  }

  it("returns no warnings when no product size is given", () => {
    expect(warningsForExpectedSize(inspection(6, 9), null)).toEqual([]);
    expect(warningsForExpectedSize(inspection(6, 9), "")).toEqual([]);
  });

  it("returns no warnings when dimensions cannot be inspected", () => {
    expect(warningsForExpectedSize(inspection(undefined, undefined), "6x9")).toEqual([]);
  });

  it("returns no warnings when dimensions match exactly", () => {
    expect(warningsForExpectedSize(inspection(6, 9), "6x9")).toEqual([]);
  });

  it("treats orientation swap as a match (6x9 vs 9x6)", () => {
    expect(warningsForExpectedSize(inspection(9, 6), "6x9")).toEqual([]);
  });

  it("tolerates a small bleed difference", () => {
    expect(warningsForExpectedSize(inspection(6.2, 9.2), "6x9")).toEqual([]);
    expect(warningsForExpectedSize(inspection(5.85, 8.85), "6x9")).toEqual([]);
  });

  it("warns when dimensions clearly don't match", () => {
    const warns = warningsForExpectedSize(inspection(4, 6), "6x9");
    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain('4" × 6"');
    expect(warns[0]).toContain('6" × 9"');
  });

  it("ignores product sizes that aren't WxH (snap pack, letter)", () => {
    expect(warningsForExpectedSize(inspection(6, 9), "Standard letter")).toEqual([]);
    expect(warningsForExpectedSize(inspection(4, 9.5), "#10 snap pack")).toEqual([]);
  });
});
