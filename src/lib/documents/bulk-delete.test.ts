import { describe, expect, it } from "vitest";
import {
  CONFIRMATION_PHRASE,
  buildDocumentWhere,
  buildCrossSectionWhere,
  chunk,
} from "./bulk-delete";

describe("CONFIRMATION_PHRASE", () => {
  it("is exactly 'DELETE ALL'", () => {
    expect(CONFIRMATION_PHRASE).toBe("DELETE ALL");
  });
});

describe("buildDocumentWhere", () => {
  it("matches everything for scopeType 'all'", () => {
    expect(buildDocumentWhere({ scopeType: "all" })).toEqual({});
  });

  it("filters by section", () => {
    expect(
      buildDocumentWhere({ scopeType: "section", section: "office" }),
    ).toEqual({ categories: { some: { category: { section: "office" } } } });
  });

  it("filters by category", () => {
    expect(
      buildDocumentWhere({
        scopeType: "category",
        section: "listing",
        categoryId: "cat_1",
      }),
    ).toEqual({ categories: { some: { categoryId: "cat_1" } } });
  });
});

describe("buildCrossSectionWhere", () => {
  it("ANDs the base where with a different-section membership", () => {
    const base = { categories: { some: { category: { section: "office" } } } };
    expect(buildCrossSectionWhere(base, "office")).toEqual({
      AND: [
        base,
        { categories: { some: { category: { section: { not: "office" } } } } },
      ],
    });
  });
});

describe("chunk", () => {
  it("splits an array into fixed-size chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunk([], 100)).toEqual([]);
  });
});
