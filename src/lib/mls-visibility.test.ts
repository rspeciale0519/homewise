import { describe, expect, it } from "vitest";
import { IDX_WHERE, VOW_WHERE, MANUAL_VISIBLE_WHERE, withIdx, withVow } from "./mls-visibility";

type ListingShape = {
  city?: string;
  status?: string;
  mlgCanUse: string[];
  mlsSource: string;
  manualStatus: string | null;
};

function matches(listing: ListingShape, extra: Partial<ListingShape> = {}): boolean {
  const passesExtra = Object.entries(extra).every(
    ([key, value]) => listing[key as keyof ListingShape] === value,
  );
  const idx = listing.mlgCanUse.includes("IDX");
  const manual = listing.mlsSource === "manual" && listing.manualStatus === "approved";
  return passesExtra && (idx || manual);
}

describe("MLS public visibility helpers", () => {
  it("exposes the IDX and manual clauses", () => {
    expect(IDX_WHERE).toEqual({ mlgCanUse: { has: "IDX" } });
    expect(MANUAL_VISIBLE_WHERE).toEqual({ mlsSource: "manual", manualStatus: "approved" });
  });

  it("combines caller filters with the visibility OR", () => {
    expect(withIdx({ city: "Tampa" })).toEqual({
      AND: [{ city: "Tampa" }, { OR: [IDX_WHERE, MANUAL_VISIBLE_WHERE] }],
    });
    expect(withIdx()).toEqual({ AND: [{}, { OR: [IDX_WHERE, MANUAL_VISIBLE_WHERE] }] });
  });

  it("admits IDX rows and approved manual rows only", () => {
    const idxRow: ListingShape = { mlgCanUse: ["IDX"], mlsSource: "stellar", manualStatus: null };
    const nonIdxMlsRow: ListingShape = { mlgCanUse: ["VOW"], mlsSource: "stellar", manualStatus: null };
    const approvedManual: ListingShape = { mlgCanUse: [], mlsSource: "manual", manualStatus: "approved" };
    const pendingManual: ListingShape = { mlgCanUse: [], mlsSource: "manual", manualStatus: "pending" };
    const archivedManual: ListingShape = { mlgCanUse: [], mlsSource: "manual", manualStatus: "archived" };

    expect(matches(idxRow)).toBe(true);
    expect(matches(approvedManual)).toBe(true);
    expect(matches(nonIdxMlsRow)).toBe(false);
    expect(matches(pendingManual)).toBe(false);
    expect(matches(archivedManual)).toBe(false);
  });
});

describe("MLS VOW (registered-consumer) visibility helper", () => {
  it("exposes the VOW clause", () => {
    expect(VOW_WHERE).toEqual({ mlgCanUse: { has: "VOW" } });
  });

  it("combines caller filters with the VOW-or-manual OR", () => {
    expect(withVow({ status: "Sold" })).toEqual({
      AND: [{ status: "Sold" }, { OR: [VOW_WHERE, MANUAL_VISIBLE_WHERE] }],
    });
    expect(withVow()).toEqual({ AND: [{}, { OR: [VOW_WHERE, MANUAL_VISIBLE_WHERE] }] });
  });

  it("is a distinct clause from IDX (VOW-only rows are not public)", () => {
    expect(VOW_WHERE).not.toEqual(IDX_WHERE);
  });
});
