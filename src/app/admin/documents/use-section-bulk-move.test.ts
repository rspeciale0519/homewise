import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSectionBulkMove } from "./use-section-bulk-move";
import type { OrganizeTree } from "./types";
import type { UseDocumentSelectionResult } from "./use-document-selection";

vi.mock("@/lib/documents-organize/bulk-membership", () => ({
  bulkMoveMemberships: vi.fn(),
}));

import { bulkMoveMemberships } from "@/lib/documents-organize/bulk-membership";
const mockedBulkMove = vi.mocked(bulkMoveMemberships);

function makeTree(): OrganizeTree {
  return {
    sections: {
      office: {
        categories: [
          {
            id: "cat-office-a",
            slug: "a",
            title: "Office A",
            description: null,
            section: "office",
            sortOrder: 0,
            documents: [
              {
                id: "doc-1",
                slug: "doc-1",
                name: "Doc 1",
                description: null,
                published: true,
                quickAccess: false,
                external: false,
                url: null,
                storageKey: "k1",
                storageProvider: "supabase",
                mimeType: "application/pdf",
                membership: { categoryId: "cat-office-a", sortOrder: 0 },
              },
              {
                id: "doc-2",
                slug: "doc-2",
                name: "Doc 2",
                description: null,
                published: true,
                quickAccess: false,
                external: false,
                url: null,
                storageKey: "k2",
                storageProvider: "supabase",
                mimeType: "application/pdf",
                membership: { categoryId: "cat-office-a", sortOrder: 1 },
              },
            ],
          },
        ],
      },
      listing: {
        categories: [
          {
            id: "cat-listing-a",
            slug: "lA",
            title: "Listing A",
            description: null,
            section: "listing",
            sortOrder: 0,
            documents: [],
          },
        ],
      },
      sales: { categories: [] },
    },
    uncategorized: [],
  };
}

function makeSelection(): UseDocumentSelectionResult {
  return {
    selectedIds: new Set<string>(),
    isSelected: () => false,
    isAllSelected: false,
    isIndeterminate: false,
    selectedCount: 0,
    toggleOne: vi.fn(),
    toggleAll: vi.fn(),
    clear: vi.fn(),
  };
}

beforeEach(() => {
  mockedBulkMove.mockReset();
});

describe("useSectionBulkMove — openForTab", () => {
  it("stores pending picker state", () => {
    const tree = makeTree();
    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree,
        setTree: vi.fn(),
        selection: makeSelection(),
        setActiveTab: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        toast: vi.fn(),
        autoSwitch: true,
      }),
    );
    act(() => {
      result.current.openForTab({
        fromSection: "office",
        toSection: "listing",
        documentIds: ["doc-1", "doc-2"],
      });
    });
    expect(result.current.pickerOpen).toBe(true);
    expect(result.current.pickerSection).toBe("listing");
    expect(result.current.pickerDocumentCount).toBe(2);
  });

  it("does not open when documentIds is empty", () => {
    const tree = makeTree();
    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree,
        setTree: vi.fn(),
        selection: makeSelection(),
        setActiveTab: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        toast: vi.fn(),
        autoSwitch: true,
      }),
    );
    act(() => {
      result.current.openForTab({
        fromSection: "office",
        toSection: "listing",
        documentIds: [],
      });
    });
    expect(result.current.pickerOpen).toBe(false);
  });
});

describe("useSectionBulkMove — moveToCategory", () => {
  it("calls the API with the correct moves payload and applies optimistic tree", async () => {
    mockedBulkMove.mockResolvedValue({
      toCategoryId: "cat-listing-a",
      moved: [
        { documentId: "doc-1", sortOrder: 0 },
        { documentId: "doc-2", sortOrder: 1 },
      ],
      skipped: [],
      failed: [],
    });
    const tree = makeTree();
    const setTree = vi.fn();
    const setActiveTab = vi.fn();
    const selection = makeSelection();
    const toast = vi.fn();

    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree,
        setTree,
        selection,
        setActiveTab,
        refetch: vi.fn().mockResolvedValue(undefined),
        toast,
        autoSwitch: true,
      }),
    );

    await act(async () => {
      await result.current.moveToCategory({
        fromSection: "office",
        toCategoryId: "cat-listing-a",
        documentIds: ["doc-1", "doc-2"],
      });
    });

    expect(mockedBulkMove).toHaveBeenCalledWith({
      toCategoryId: "cat-listing-a",
      moves: [
        { documentId: "doc-1", fromCategoryId: "cat-office-a" },
        { documentId: "doc-2", fromCategoryId: "cat-office-a" },
      ],
    });
    expect(setTree).toHaveBeenCalledTimes(1);
    expect(setActiveTab).toHaveBeenCalledWith("listing");
    expect(selection.clear).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Moved 2 to Listing A", "success");
  });

  it("skips auto-switch when autoSwitch is false", async () => {
    mockedBulkMove.mockResolvedValue({
      toCategoryId: "cat-listing-a",
      moved: [{ documentId: "doc-1", sortOrder: 0 }],
      skipped: [],
      failed: [],
    });
    const setActiveTab = vi.fn();
    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree: makeTree(),
        setTree: vi.fn(),
        selection: makeSelection(),
        setActiveTab,
        refetch: vi.fn().mockResolvedValue(undefined),
        toast: vi.fn(),
        autoSwitch: false,
      }),
    );
    await act(async () => {
      await result.current.moveToCategory({
        fromSection: "office",
        toCategoryId: "cat-listing-a",
        documentIds: ["doc-1"],
      });
    });
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it("rolls back tree on API failure", async () => {
    mockedBulkMove.mockRejectedValue(new Error("Network sad"));
    const tree = makeTree();
    const setTree = vi.fn();
    const toast = vi.fn();
    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree,
        setTree,
        selection: makeSelection(),
        setActiveTab: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        toast,
        autoSwitch: true,
      }),
    );
    await act(async () => {
      await result.current.moveToCategory({
        fromSection: "office",
        toCategoryId: "cat-listing-a",
        documentIds: ["doc-1"],
      });
    });
    // First call: optimistic; second call: rollback to original snapshot
    expect(setTree).toHaveBeenCalledTimes(2);
    expect(setTree).toHaveBeenLastCalledWith(tree);
    expect(toast).toHaveBeenCalledWith("Network sad", "error");
  });

  it("is a no-op when no docs are actually moving (all already in target)", async () => {
    const tree = makeTree();
    const setTree = vi.fn();
    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree,
        setTree,
        selection: makeSelection(),
        setActiveTab: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        toast: vi.fn(),
        autoSwitch: true,
      }),
    );
    await act(async () => {
      await result.current.moveToCategory({
        fromSection: "office",
        toCategoryId: "cat-office-a",
        documentIds: ["doc-1", "doc-2"],
      });
    });
    expect(mockedBulkMove).not.toHaveBeenCalled();
    expect(setTree).not.toHaveBeenCalled();
  });
});

describe("useSectionBulkMove — moveToUncategorized", () => {
  it("calls the API with toCategoryId: null", async () => {
    mockedBulkMove.mockResolvedValue({
      toCategoryId: null,
      moved: [{ documentId: "doc-1", sortOrder: null }],
      skipped: [],
      failed: [],
    });
    const toast = vi.fn();
    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree: makeTree(),
        setTree: vi.fn(),
        selection: makeSelection(),
        setActiveTab: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        toast,
        autoSwitch: true,
      }),
    );
    await act(async () => {
      await result.current.moveToUncategorized({
        fromSection: "office",
        documentIds: ["doc-1"],
      });
    });
    expect(mockedBulkMove).toHaveBeenCalledWith({
      toCategoryId: null,
      moves: [{ documentId: "doc-1", fromCategoryId: "cat-office-a" }],
    });
    expect(toast).toHaveBeenCalledWith("Removed 1 from category", "success");
  });
});

describe("useSectionBulkMove — confirmPicker", () => {
  it("runs the move and closes the picker", async () => {
    mockedBulkMove.mockResolvedValue({
      toCategoryId: "cat-listing-a",
      moved: [{ documentId: "doc-1", sortOrder: 0 }],
      skipped: [],
      failed: [],
    });
    const { result } = renderHook(() =>
      useSectionBulkMove({
        tree: makeTree(),
        setTree: vi.fn(),
        selection: makeSelection(),
        setActiveTab: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        toast: vi.fn(),
        autoSwitch: true,
      }),
    );
    act(() => {
      result.current.openForTab({
        fromSection: "office",
        toSection: "listing",
        documentIds: ["doc-1"],
      });
    });
    await act(async () => {
      await result.current.confirmPicker({
        section: "listing",
        categoryId: "cat-listing-a",
        categoryTitle: "Listing A",
      });
    });
    expect(result.current.pickerOpen).toBe(false);
    expect(mockedBulkMove).toHaveBeenCalled();
  });
});
