import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { bulkAssignMock, bulkUnassignMock } = vi.hoisted(() => ({
  bulkAssignMock: vi.fn(),
  bulkUnassignMock: vi.fn(),
}));

vi.mock("@/lib/documents-organize/bulk-membership", () => ({
  bulkAssignMemberships: bulkAssignMock,
  bulkUnassignMemberships: bulkUnassignMock,
}));

import { useUncategorizedBulkCategorize } from "./use-uncategorized-bulk-categorize";
import type {
  AdminUncategorizedDoc,
  OrganizeTree,
} from "./types";
import type { UseUncategorizedSelectionResult } from "./use-uncategorized-selection";

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

function makeSelection(
  selectedIds: Set<string> = new Set(),
): UseUncategorizedSelectionResult {
  return {
    selectedIds,
    isSelected: (id) => selectedIds.has(id),
    isAllSelected: false,
    isIndeterminate: selectedIds.size > 0,
    selectedCount: selectedIds.size,
    toggleOne: vi.fn(),
    toggleAll: vi.fn(),
    toggleSubset: vi.fn(),
    clear: vi.fn(),
  };
}

function setupHook(overrides: {
  autoSwitch?: boolean;
  selectedIds?: Set<string>;
} = {}) {
  const tree = buildTree();
  const setTree = vi.fn();
  const setActiveTab = vi.fn();
  const refetch = vi.fn().mockResolvedValue(undefined);
  const toast = vi.fn();
  const toastWithUndo = vi.fn();
  const selection = makeSelection(overrides.selectedIds);
  const { result } = renderHook(() =>
    useUncategorizedBulkCategorize({
      tree,
      setTree,
      uncategorizedDocs: tree.uncategorized!,
      uncategorizedIds: tree.uncategorized!.map((d) => d.id),
      selection,
      setActiveTab,
      refetch,
      toast,
      toastWithUndo,
      autoSwitch: overrides.autoSwitch ?? false,
    }),
  );
  return {
    result,
    tree,
    setTree,
    setActiveTab,
    selection,
    refetch,
    toast,
    toastWithUndo,
  };
}

async function openSectionAndConfirm(
  hookResult: ReturnType<typeof setupHook>,
  documentIds: string[] = ["u1", "u2"],
) {
  act(() => {
    hookResult.result.current.openForSection("listing", documentIds);
  });
  await act(async () => {
    await hookResult.result.current.confirmPicker({
      section: "listing",
      categoryId: "listingCat",
      categoryTitle: "Buyer Forms",
    });
  });
}

describe("useUncategorizedBulkCategorize", () => {
  beforeEach(() => {
    bulkAssignMock.mockReset();
    bulkUnassignMock.mockReset();
  });

  afterEach(() => {
    bulkAssignMock.mockReset();
    bulkUnassignMock.mockReset();
  });

  it("openForSection sets picker state with that section", () => {
    const { result } = setupHook();
    expect(result.current.pickerOpen).toBe(false);
    act(() => result.current.openForSection("listing", ["u1"]));
    expect(result.current.pickerOpen).toBe(true);
    expect(result.current.pickerSection).toBe("listing");
    expect(result.current.pickerDocumentCount).toBe(1);
  });

  it("openForCurrentSelection only fires when there is a selection", () => {
    const { result } = setupHook({ selectedIds: new Set() });
    act(() => result.current.openForCurrentSelection());
    expect(result.current.pickerOpen).toBe(false);
  });

  it("openForCurrentSelection opens with no section preset and ids from selection", () => {
    const { result } = setupHook({ selectedIds: new Set(["u1", "u2"]) });
    act(() => result.current.openForCurrentSelection());
    expect(result.current.pickerOpen).toBe(true);
    expect(result.current.pickerSection).toBeUndefined();
    expect(result.current.pickerDocumentCount).toBe(2);
  });

  it("cancelPicker clears pending state", () => {
    const { result } = setupHook();
    act(() => result.current.openForSection("listing", ["u1"]));
    act(() => result.current.cancelPicker());
    expect(result.current.pickerOpen).toBe(false);
  });

  it("happy path: confirmPicker fires API + clears selection + undo toast", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [
        { documentId: "u1", sortOrder: 0 },
        { documentId: "u2", sortOrder: 1 },
      ],
      skipped: [],
      failed: [],
    });
    const setup = setupHook();
    await openSectionAndConfirm(setup);
    expect(setup.setTree).toHaveBeenCalledTimes(1);
    expect(setup.selection.clear).toHaveBeenCalled();
    expect(setup.toastWithUndo).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Assigned 2 to Buyer Forms",
        onUndo: expect.any(Function),
      }),
    );
  });

  it("autoSwitch=true triggers setActiveTab to the destination section", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [{ documentId: "u1", sortOrder: 0 }],
      skipped: [],
      failed: [],
    });
    const setup = setupHook({ autoSwitch: true });
    await openSectionAndConfirm(setup, ["u1"]);
    expect(setup.setActiveTab).toHaveBeenCalledWith("listing");
  });

  it("autoSwitch=false leaves the active tab alone", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [{ documentId: "u1", sortOrder: 0 }],
      skipped: [],
      failed: [],
    });
    const setup = setupHook({ autoSwitch: false });
    await openSectionAndConfirm(setup, ["u1"]);
    expect(setup.setActiveTab).not.toHaveBeenCalled();
  });

  it("partial success: error toast + refetch + no undo", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [{ documentId: "u1", sortOrder: 0 }],
      skipped: [],
      failed: [{ documentId: "u2", error: "document-not-found" }],
    });
    const setup = setupHook();
    await openSectionAndConfirm(setup);
    expect(setup.refetch).toHaveBeenCalled();
    expect(setup.toast).toHaveBeenCalledWith(
      expect.stringMatching(/assigned 1 of 2 to buyer forms/i),
      "error",
    );
    expect(setup.toastWithUndo).not.toHaveBeenCalled();
  });

  it("full failure: rolls back + error toast + refetch", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [],
      skipped: [],
      failed: [
        { documentId: "u1", error: "document-not-found" },
        { documentId: "u2", error: "document-not-found" },
      ],
    });
    const setup = setupHook();
    await openSectionAndConfirm(setup);
    expect(setup.setTree).toHaveBeenCalledTimes(2);
    expect(setup.setTree).toHaveBeenLastCalledWith(setup.tree);
    expect(setup.refetch).toHaveBeenCalled();
    expect(setup.toast).toHaveBeenCalledWith(
      expect.stringMatching(/could not move any documents/i),
      "error",
    );
  });

  it("API throws: rolls back + surface message", async () => {
    bulkAssignMock.mockRejectedValue(new Error("Network down"));
    const setup = setupHook();
    await openSectionAndConfirm(setup, ["u1"]);
    expect(setup.setTree).toHaveBeenLastCalledWith(setup.tree);
    expect(setup.toast).toHaveBeenCalledWith("Network down", "error");
  });

  it("undo callback calls bulkUnassignMemberships and refetches", async () => {
    bulkAssignMock.mockResolvedValue({
      categoryId: "listingCat",
      assigned: [
        { documentId: "u1", sortOrder: 0 },
        { documentId: "u2", sortOrder: 1 },
      ],
      skipped: [],
      failed: [],
    });
    bulkUnassignMock.mockResolvedValue({
      categoryId: "listingCat",
      removed: ["u1", "u2"],
      failed: [],
    });
    const setup = setupHook();
    await openSectionAndConfirm(setup);
    const undoCall = setup.toastWithUndo.mock.calls[0]?.[0] as
      | { onUndo: () => void | Promise<void> }
      | undefined;
    expect(undoCall).toBeDefined();
    setup.refetch.mockClear();
    await act(async () => {
      await undoCall!.onUndo();
    });
    expect(bulkUnassignMock).toHaveBeenCalledWith({
      categoryId: "listingCat",
      documentIds: ["u1", "u2"],
    });
    expect(setup.toast).toHaveBeenCalledWith("Undone", "success");
    expect(setup.refetch).toHaveBeenCalled();
  });
});
