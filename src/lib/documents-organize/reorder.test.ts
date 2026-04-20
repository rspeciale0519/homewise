import { describe, it, expect } from "vitest";
import {
  computeCategoryReorder,
  computeDocReorder,
  computeCrossCategoryMove,
} from "./reorder";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  OrganizeTree,
} from "@/app/admin/documents/types";

function makeDoc(
  id: string,
  categoryId: string,
  sortOrder: number,
  overrides: Partial<AdminDocumentInCategory> = {},
): AdminDocumentInCategory {
  return {
    id,
    slug: id,
    name: id,
    description: null,
    published: true,
    quickAccess: false,
    external: false,
    url: null,
    storageKey: `${id}.pdf`,
    storageProvider: "supabase",
    mimeType: "application/pdf",
    membership: { categoryId, sortOrder },
    ...overrides,
  };
}

function makeCat(
  id: string,
  section: "office" | "listing" | "sales",
  sortOrder: number,
  documents: AdminDocumentInCategory[] = [],
): AdminCategoryTree {
  return {
    id,
    slug: id,
    title: id,
    description: null,
    section,
    sortOrder,
    documents,
  };
}

describe("computeCategoryReorder", () => {
  it("moves a category from position 0 to 2 within a section", () => {
    const cats = [
      makeCat("a", "office", 0),
      makeCat("b", "office", 1),
      makeCat("c", "office", 2),
    ];
    const result = computeCategoryReorder(cats, 0, 2);
    expect(result.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(result.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });

  it("is a no-op when fromIndex equals toIndex", () => {
    const cats = [makeCat("a", "office", 0), makeCat("b", "office", 1)];
    const result = computeCategoryReorder(cats, 1, 1);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("moves a category from end to start", () => {
    const cats = [
      makeCat("a", "office", 0),
      makeCat("b", "office", 1),
      makeCat("c", "office", 2),
    ];
    const result = computeCategoryReorder(cats, 2, 0);
    expect(result.map((c) => c.id)).toEqual(["c", "a", "b"]);
    expect(result.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });
});

describe("computeDocReorder", () => {
  it("moves a doc within a category", () => {
    const docs = [
      makeDoc("d1", "cat", 0),
      makeDoc("d2", "cat", 1),
      makeDoc("d3", "cat", 2),
    ];
    const result = computeDocReorder(docs, 0, 2);
    expect(result.map((d) => d.id)).toEqual(["d2", "d3", "d1"]);
    expect(result.map((d) => d.membership.sortOrder)).toEqual([0, 1, 2]);
  });

  it("returns identity on same-index drop", () => {
    const docs = [makeDoc("d1", "cat", 0), makeDoc("d2", "cat", 1)];
    const result = computeDocReorder(docs, 0, 0);
    expect(result.map((d) => d.id)).toEqual(["d1", "d2"]);
  });
});

describe("computeCrossCategoryMove", () => {
  const tree: OrganizeTree = {
    sections: {
      office: {
        categories: [
          makeCat("catA", "office", 0, [
            makeDoc("d1", "catA", 0),
            makeDoc("d2", "catA", 1),
          ]),
          makeCat("catB", "office", 1, [makeDoc("d3", "catB", 0)]),
        ],
      },
      listing: { categories: [] },
      sales: { categories: [] },
    },
  };

  it("moves a doc from catA to catB at index 1", () => {
    const result = computeCrossCategoryMove(tree, "d1", "catA", "catB", 1);
    const catA = result.sections.office.categories.find((c) => c.id === "catA")!;
    const catB = result.sections.office.categories.find((c) => c.id === "catB")!;
    expect(catA.documents.map((d) => d.id)).toEqual(["d2"]);
    expect(catA.documents[0]!.membership.sortOrder).toBe(0);
    expect(catB.documents.map((d) => d.id)).toEqual(["d3", "d1"]);
    expect(catB.documents[1]!.membership.categoryId).toBe("catB");
    expect(catB.documents[1]!.membership.sortOrder).toBe(1);
  });

  it("moves a doc from catA to empty category", () => {
    const tree2: OrganizeTree = {
      sections: {
        office: {
          categories: [
            makeCat("catA", "office", 0, [makeDoc("d1", "catA", 0)]),
            makeCat("catEmpty", "office", 1, []),
          ],
        },
        listing: { categories: [] },
        sales: { categories: [] },
      },
    };
    const result = computeCrossCategoryMove(tree2, "d1", "catA", "catEmpty", 0);
    const catA = result.sections.office.categories.find((c) => c.id === "catA")!;
    const catEmpty = result.sections.office.categories.find(
      (c) => c.id === "catEmpty",
    )!;
    expect(catA.documents).toEqual([]);
    expect(catEmpty.documents.map((d) => d.id)).toEqual(["d1"]);
    expect(catEmpty.documents[0]!.membership.categoryId).toBe("catEmpty");
  });

  it("moves a doc across sections (Office → Listing)", () => {
    const crossTree: OrganizeTree = {
      sections: {
        office: {
          categories: [
            makeCat("catOffice", "office", 0, [
              makeDoc("d1", "catOffice", 0),
              makeDoc("d2", "catOffice", 1),
            ]),
          ],
        },
        listing: {
          categories: [
            makeCat("catListing", "listing", 0, [
              makeDoc("d3", "catListing", 0),
            ]),
          ],
        },
        sales: { categories: [] },
      },
    };
    const result = computeCrossCategoryMove(
      crossTree,
      "d1",
      "catOffice",
      "catListing",
      1,
    );
    const office = result.sections.office.categories.find(
      (c) => c.id === "catOffice",
    )!;
    const listing = result.sections.listing.categories.find(
      (c) => c.id === "catListing",
    )!;
    expect(office.documents.map((d) => d.id)).toEqual(["d2"]);
    expect(listing.documents.map((d) => d.id)).toEqual(["d3", "d1"]);
    expect(listing.documents[1]!.membership.categoryId).toBe("catListing");
    expect(listing.documents[1]!.membership.sortOrder).toBe(1);
  });

  it("moves a doc across sections into an empty target category", () => {
    const crossTree: OrganizeTree = {
      sections: {
        office: {
          categories: [
            makeCat("catOffice", "office", 0, [makeDoc("d1", "catOffice", 0)]),
          ],
        },
        listing: {
          categories: [makeCat("catListingEmpty", "listing", 0, [])],
        },
        sales: { categories: [] },
      },
    };
    const result = computeCrossCategoryMove(
      crossTree,
      "d1",
      "catOffice",
      "catListingEmpty",
      0,
    );
    const office = result.sections.office.categories.find(
      (c) => c.id === "catOffice",
    )!;
    const listing = result.sections.listing.categories.find(
      (c) => c.id === "catListingEmpty",
    )!;
    expect(office.documents).toEqual([]);
    expect(listing.documents.map((d) => d.id)).toEqual(["d1"]);
    expect(listing.documents[0]!.membership.categoryId).toBe(
      "catListingEmpty",
    );
  });
});
