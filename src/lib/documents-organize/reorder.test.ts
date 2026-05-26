import { describe, it, expect } from "vitest";
import {
  computeBulkAssignFromUncategorized,
  computeBulkMoveBetweenCategories,
  computeBulkUnassign,
  computeCategoryReorder,
  computeCrossCategoryMove,
  computeDocReorder,
} from "./reorder";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  AdminUncategorizedDoc,
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

  it("preserves tree.uncategorized when moving across categories (existing regression test)", () => {
    const uncatDoc: AdminUncategorizedDoc = {
      id: "u1",
      slug: "u1",
      name: "Uncategorized Doc",
      description: null,
      published: true,
      external: false,
      url: null,
      storageKey: "u1.pdf",
      storageProvider: "supabase",
      mimeType: "application/pdf",
    };
    const treeWithUncat: OrganizeTree = {
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
      uncategorized: [uncatDoc],
    };

    const out = computeCrossCategoryMove(treeWithUncat, "d1", "catA", "catB", 0);
    expect(out.uncategorized).toEqual(treeWithUncat.uncategorized);
  });
});

function makeUncat(id: string, overrides: Partial<AdminUncategorizedDoc> = {}): AdminUncategorizedDoc {
  return {
    id,
    slug: id,
    name: id,
    description: null,
    published: false,
    external: false,
    url: null,
    storageKey: `${id}.pdf`,
    storageProvider: "supabase",
    mimeType: "application/pdf",
    ...overrides,
  };
}

describe("computeBulkAssignFromUncategorized", () => {
  const baseTree: OrganizeTree = {
    sections: {
      office: {
        categories: [
          makeCat("officeCat", "office", 0, [makeDoc("dExisting", "officeCat", 0)]),
        ],
      },
      listing: { categories: [makeCat("listingCat", "listing", 0, [])] },
      sales: { categories: [] },
    },
    uncategorized: [
      makeUncat("u1", { name: "Doc One" }),
      makeUncat("u2", { name: "Doc Two" }),
      makeUncat("u3", { name: "Doc Three" }),
    ],
  };

  it("moves selected docs out of uncategorized and appends to target category", () => {
    const out = computeBulkAssignFromUncategorized({
      tree: baseTree,
      documentIds: ["u1", "u3"],
      toCategoryId: "listingCat",
      uncategorizedDocs: baseTree.uncategorized!,
    });
    expect(out.uncategorized?.map((d) => d.id)).toEqual(["u2"]);
    const listingCat = out.sections.listing.categories.find(
      (c) => c.id === "listingCat",
    )!;
    expect(listingCat.documents.map((d) => d.id)).toEqual(["u1", "u3"]);
    expect(listingCat.documents[0]!.membership).toEqual({
      categoryId: "listingCat",
      sortOrder: 0,
    });
    expect(listingCat.documents[1]!.membership.sortOrder).toBe(1);
  });

  it("appends after existing docs preserving sortOrder density", () => {
    const out = computeBulkAssignFromUncategorized({
      tree: baseTree,
      documentIds: ["u1"],
      toCategoryId: "officeCat",
      uncategorizedDocs: baseTree.uncategorized!,
    });
    const officeCat = out.sections.office.categories.find(
      (c) => c.id === "officeCat",
    )!;
    expect(officeCat.documents.map((d) => d.id)).toEqual(["dExisting", "u1"]);
    expect(officeCat.documents[1]!.membership.sortOrder).toBe(1);
  });

  it("returns the tree unchanged when target category is missing", () => {
    const out = computeBulkAssignFromUncategorized({
      tree: baseTree,
      documentIds: ["u1"],
      toCategoryId: "ghostCat",
      uncategorizedDocs: baseTree.uncategorized!,
    });
    expect(out).toBe(baseTree);
  });

  it("returns the tree unchanged when documentIds is empty", () => {
    const out = computeBulkAssignFromUncategorized({
      tree: baseTree,
      documentIds: [],
      toCategoryId: "listingCat",
      uncategorizedDocs: baseTree.uncategorized!,
    });
    expect(out).toBe(baseTree);
  });

  it("returns the tree unchanged when no docs match the documentIds", () => {
    const out = computeBulkAssignFromUncategorized({
      tree: baseTree,
      documentIds: ["doesNotExist"],
      toCategoryId: "listingCat",
      uncategorizedDocs: baseTree.uncategorized!,
    });
    expect(out).toBe(baseTree);
  });
});

describe("computeBulkUnassign", () => {
  const treeWithMembership: OrganizeTree = {
    sections: {
      office: {
        categories: [
          makeCat("officeCat", "office", 0, [
            makeDoc("d1", "officeCat", 0, { name: "D One", published: false }),
            makeDoc("d2", "officeCat", 1, { name: "D Two" }),
            makeDoc("d3", "officeCat", 2, { name: "D Three" }),
          ]),
        ],
      },
      listing: { categories: [] },
      sales: { categories: [] },
    },
    uncategorized: [makeUncat("uOriginal")],
  };

  it("removes docs from source category and appends to uncategorized", () => {
    const out = computeBulkUnassign({
      tree: treeWithMembership,
      documentIds: ["d1", "d3"],
      fromCategoryId: "officeCat",
    });
    const officeCat = out.sections.office.categories.find(
      (c) => c.id === "officeCat",
    )!;
    expect(officeCat.documents.map((d) => d.id)).toEqual(["d2"]);
    expect(officeCat.documents[0]!.membership.sortOrder).toBe(0);
    expect(out.uncategorized?.map((d) => d.id).sort()).toEqual([
      "d1",
      "d3",
      "uOriginal",
    ]);
  });

  it("returns the tree unchanged when documentIds is empty", () => {
    const out = computeBulkUnassign({
      tree: treeWithMembership,
      documentIds: [],
      fromCategoryId: "officeCat",
    });
    expect(out).toBe(treeWithMembership);
  });

  it("returns the tree unchanged when no docs match in the category", () => {
    const out = computeBulkUnassign({
      tree: treeWithMembership,
      documentIds: ["notInCategory"],
      fromCategoryId: "officeCat",
    });
    expect(out).toBe(treeWithMembership);
  });

  it("preserves published flag of unassigned docs in uncategorized", () => {
    const out = computeBulkUnassign({
      tree: treeWithMembership,
      documentIds: ["d1"],
      fromCategoryId: "officeCat",
    });
    const restored = out.uncategorized?.find((d) => d.id === "d1");
    expect(restored?.published).toBe(false);
  });
});

describe("computeBulkMoveBetweenCategories", () => {
  const buildBaseTree = (): OrganizeTree => ({
    sections: {
      office: {
        categories: [
          makeCat("officeA", "office", 0, [
            makeDoc("d1", "officeA", 0),
            makeDoc("d2", "officeA", 1),
          ]),
          makeCat("officeB", "office", 1, [makeDoc("d3", "officeB", 0)]),
        ],
      },
      listing: {
        categories: [
          makeCat("listingX", "listing", 0, [makeDoc("dExist", "listingX", 0)]),
        ],
      },
      sales: { categories: [] },
    },
    uncategorized: [],
  });

  it("returns the tree unchanged when moves is empty", () => {
    const tree = buildBaseTree();
    const out = computeBulkMoveBetweenCategories({
      tree,
      moves: [],
      toCategoryId: "listingX",
    });
    expect(out).toBe(tree);
  });

  it("moves docs from one source category to a different-section target", () => {
    const tree = buildBaseTree();
    const out = computeBulkMoveBetweenCategories({
      tree,
      moves: [
        { documentId: "d1", fromCategoryId: "officeA" },
        { documentId: "d2", fromCategoryId: "officeA" },
      ],
      toCategoryId: "listingX",
    });
    const officeA = out.sections.office.categories.find(
      (c) => c.id === "officeA",
    )!;
    expect(officeA.documents.map((d) => d.id)).toEqual([]);
    const listingX = out.sections.listing.categories.find(
      (c) => c.id === "listingX",
    )!;
    expect(listingX.documents.map((d) => d.id)).toEqual(["dExist", "d1", "d2"]);
    expect(listingX.documents[1]!.membership.sortOrder).toBe(1);
    expect(listingX.documents[2]!.membership.sortOrder).toBe(2);
    expect(listingX.documents[2]!.membership.categoryId).toBe("listingX");
  });

  it("moves docs from multiple source categories into one target", () => {
    const tree = buildBaseTree();
    const out = computeBulkMoveBetweenCategories({
      tree,
      moves: [
        { documentId: "d1", fromCategoryId: "officeA" },
        { documentId: "d3", fromCategoryId: "officeB" },
      ],
      toCategoryId: "listingX",
    });
    const officeA = out.sections.office.categories.find(
      (c) => c.id === "officeA",
    )!;
    const officeB = out.sections.office.categories.find(
      (c) => c.id === "officeB",
    )!;
    expect(officeA.documents.map((d) => d.id)).toEqual(["d2"]);
    expect(officeA.documents[0]!.membership.sortOrder).toBe(0);
    expect(officeB.documents).toEqual([]);
    const listingX = out.sections.listing.categories.find(
      (c) => c.id === "listingX",
    )!;
    expect(listingX.documents.map((d) => d.id)).toEqual(["dExist", "d1", "d3"]);
  });

  it("moves docs to a target category within the same section", () => {
    const tree = buildBaseTree();
    const out = computeBulkMoveBetweenCategories({
      tree,
      moves: [{ documentId: "d1", fromCategoryId: "officeA" }],
      toCategoryId: "officeB",
    });
    const officeA = out.sections.office.categories.find(
      (c) => c.id === "officeA",
    )!;
    const officeB = out.sections.office.categories.find(
      (c) => c.id === "officeB",
    )!;
    expect(officeA.documents.map((d) => d.id)).toEqual(["d2"]);
    expect(officeB.documents.map((d) => d.id)).toEqual(["d3", "d1"]);
    expect(officeB.documents[1]!.membership.categoryId).toBe("officeB");
  });

  it("moves docs to Uncategorized when toCategoryId is null", () => {
    const tree = buildBaseTree();
    const out = computeBulkMoveBetweenCategories({
      tree,
      moves: [
        { documentId: "d1", fromCategoryId: "officeA" },
        { documentId: "d3", fromCategoryId: "officeB" },
      ],
      toCategoryId: null,
    });
    const officeA = out.sections.office.categories.find(
      (c) => c.id === "officeA",
    )!;
    expect(officeA.documents.map((d) => d.id)).toEqual(["d2"]);
    expect(out.uncategorized?.map((d) => d.id)).toEqual(["d1", "d3"]);
  });

  it("returns the tree unchanged when toCategoryId is non-null but not found", () => {
    const tree = buildBaseTree();
    const out = computeBulkMoveBetweenCategories({
      tree,
      moves: [{ documentId: "d1", fromCategoryId: "officeA" }],
      toCategoryId: "ghost",
    });
    expect(out).toBe(tree);
  });

  it("ignores moves whose document is not in the named source category", () => {
    const tree = buildBaseTree();
    const out = computeBulkMoveBetweenCategories({
      tree,
      moves: [
        { documentId: "dDoesNotExist", fromCategoryId: "officeA" },
        { documentId: "d1", fromCategoryId: "officeA" },
      ],
      toCategoryId: "listingX",
    });
    const listingX = out.sections.listing.categories.find(
      (c) => c.id === "listingX",
    )!;
    expect(listingX.documents.map((d) => d.id)).toEqual(["dExist", "d1"]);
  });
});
