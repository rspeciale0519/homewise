import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { bulkAssignMock } = vi.hoisted(() => ({
  bulkAssignMock: vi.fn(),
}));

vi.mock("@/lib/documents-organize/bulk-membership", () => ({
  bulkAssignMemberships: bulkAssignMock,
  bulkUnassignMemberships: vi.fn(),
}));

import { useUncategorizedBulkCategorize } from "./use-uncategorized-bulk-categorize";
import type {
  AdminUncategorizedDoc,
  OrganizeTree,
} from "./types";

function makeUncat(id: string, name: string): AdminUncategorizedDoc {
  return {
    id,
    slug: id,
    name,
    description: null,
    published: false,
    external: false,
    url: null,
    storageKey: `${id}.pdf`,
    storageProvider: "supabase",
    mimeType: "application/pdf",
  };
}

function buildTree(): OrganizeTree {
  return {
    sections: {
      office: { categories: [] },
      listing: {
        categories: [
          {
            id: "listingCat",
            slug: "listingCat",
            title: "Buyer Forms",
            description: null,
            section: "listing",
            sortOrder: 0,
            documents: [],
          },
        ],
      },
      sales: { categories: [] },
    },
    uncategorized: [makeUncat("u1", "Doc A"), makeUncat("u2", "Doc B")],
  };
}

function setupHook(overrides: { autoSwitch?: boolean } = {}) {
  const tree = buildTree();
  const setTree = vi.fn();
  const setActiveTab = vi.fn();
  const clearSelection = vi.fn();
  const refetch = vi.fn().mockResolvedValue(undefined);
  const toast = vi.fn();
  const { result } = renderHook(() =>
    useUncategorizedBulkCategorize({
      tree,
      setTree,
      uncategorizedDocs: tree.uncategorized!,
      setActiveTab,
      clearSelection,
      refetch,
      toast,
      autoSwitch: overrides.autoSwitch ?? false,
    }),
  );
  return {
    result,
    tree,
    setTree,
    setActiveTab,
    clearSelection,
    refetch,
    toast,
  };
}

describe("useUncategorizedBulkCategorize.assignFromUncategorized", () => {
  beforeEach(() => {
    bulkAssignMock.mockReset();
  });

  afterEach(() => {
    bulkAssignMock.mockReset();
  });

  it("happy path: optimistic update + API success + success toast + clearSelection", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [
        { documentId: "u1", sortOrder: 0 },
        { documentId: "u2", sortOrder: 1 },
      ],
      skipped: [],
      failed: [],
    });
    const { result, setTree, clearSelection, toast } = setupHook();
    await act(async () => {
      await result.current.assignFromUncategorized({
        section: "listing",
        categoryId: "listingCat",
        categoryTitle: "Buyer Forms",
        documentIds: ["u1", "u2"],
      });
    });
    expect(setTree).toHaveBeenCalledTimes(1); // optimistic only (no rollback)
    expect(clearSelection).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      "Assigned 2 to Buyer Forms",
      "success",
    );
  });

  it("autoSwitch=true triggers setActiveTab to the destination section", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [{ documentId: "u1", sortOrder: 0 }],
      skipped: [],
      failed: [],
    });
    const { result, setActiveTab } = setupHook({ autoSwitch: true });
    await act(async () => {
      await result.current.assignFromUncategorized({
        section: "listing",
        categoryId: "listingCat",
        categoryTitle: "Buyer Forms",
        documentIds: ["u1"],
      });
    });
    expect(setActiveTab).toHaveBeenCalledWith("listing");
  });

  it("autoSwitch=false leaves the active tab alone", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [{ documentId: "u1", sortOrder: 0 }],
      skipped: [],
      failed: [],
    });
    const { result, setActiveTab } = setupHook({ autoSwitch: false });
    await act(async () => {
      await result.current.assignFromUncategorized({
        section: "listing",
        categoryId: "listingCat",
        categoryTitle: "Buyer Forms",
        documentIds: ["u1"],
      });
    });
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it("partial success: shows error toast with counts, refetches, keeps optimistic state", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [{ documentId: "u1", sortOrder: 0 }],
      skipped: [],
      failed: [{ documentId: "u2", error: "document-not-found" }],
    });
    const { result, setTree, refetch, toast } = setupHook();
    await act(async () => {
      await result.current.assignFromUncategorized({
        section: "listing",
        categoryId: "listingCat",
        categoryTitle: "Buyer Forms",
        documentIds: ["u1", "u2"],
      });
    });
    expect(setTree).toHaveBeenCalledTimes(1); // no rollback
    expect(refetch).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.stringMatching(/assigned 1 of 2 to buyer forms/i),
      "error",
    );
  });

  it("full failure (zero assigned): rolls back snapshot + error toast + refetch", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [],
      skipped: [],
      failed: [
        { documentId: "u1", error: "document-not-found" },
        { documentId: "u2", error: "document-not-found" },
      ],
    });
    const { result, setTree, refetch, toast, tree } = setupHook();
    await act(async () => {
      await result.current.assignFromUncategorized({
        section: "listing",
        categoryId: "listingCat",
        categoryTitle: "Buyer Forms",
        documentIds: ["u1", "u2"],
      });
    });
    expect(setTree).toHaveBeenCalledTimes(2); // optimistic + rollback
    expect(setTree).toHaveBeenLastCalledWith(tree);
    expect(refetch).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.stringMatching(/could not move any documents/i),
      "error",
    );
  });

  it("API throws: rolls back and surfaces error message", async () => {
    bulkAssignMock.mockRejectedValue(new Error("Network down"));
    const { result, setTree, toast, tree } = setupHook();
    await act(async () => {
      await result.current.assignFromUncategorized({
        section: "listing",
        categoryId: "listingCat",
        categoryTitle: "Buyer Forms",
        documentIds: ["u1"],
      });
    });
    expect(setTree).toHaveBeenLastCalledWith(tree);
    expect(toast).toHaveBeenCalledWith("Network down", "error");
  });

  it("no-op when documentIds is empty", async () => {
    const { result, setTree } = setupHook();
    await act(async () => {
      await result.current.assignFromUncategorized({
        section: "listing",
        categoryId: "listingCat",
        categoryTitle: "Buyer Forms",
        documentIds: [],
      });
    });
    expect(setTree).not.toHaveBeenCalled();
    expect(bulkAssignMock).not.toHaveBeenCalled();
  });
});
