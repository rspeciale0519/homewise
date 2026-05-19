import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUncategorizedActions } from "./use-uncategorized-actions";
import type { AdminUncategorizedDoc } from "./types";

const doc: AdminUncategorizedDoc = {
  id: "u1",
  slug: "loose-doc",
  name: "Loose Doc",
  description: null,
  published: false,
  external: false,
  url: null,
  storageKey: "documents/k-u1",
  storageProvider: "supabase",
  mimeType: "application/pdf",
};

function makeDeps() {
  return {
    setEditingDoc: vi.fn(),
    setDocDrawerOpen: vi.fn(),
    setBulkUploadOpen: vi.fn(),
    setActiveTab: vi.fn(),
    refetch: vi.fn(),
    toast: vi.fn(),
  };
}

describe("useUncategorizedActions", () => {
  it("handleEditUncategorized opens the drawer with a mapped DocumentItem", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useUncategorizedActions(deps));
    result.current.handleEditUncategorized(doc);
    expect(deps.setEditingDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1", categories: [], quickAccess: false }),
    );
    expect(deps.setDocDrawerOpen).toHaveBeenCalledWith(true);
  });

  it("handleBulkUploaded closes dialog, toasts success, switches tab, refetches", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useUncategorizedActions(deps));
    result.current.handleBulkUploaded({
      created: [{ id: "1", name: "a", slug: "a" }],
      failed: [],
    });
    expect(deps.setBulkUploadOpen).toHaveBeenCalledWith(false);
    expect(deps.toast).toHaveBeenCalledWith(
      "Uploaded 1 to Uncategorized",
      "success",
    );
    expect(deps.setActiveTab).toHaveBeenCalledWith("uncategorized");
    expect(deps.refetch).toHaveBeenCalled();
  });

  it("handleBulkUploaded reports failures as an error toast", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useUncategorizedActions(deps));
    result.current.handleBulkUploaded({
      created: [{ id: "1", name: "a", slug: "a" }],
      failed: [{ name: "b", error: "x" }],
    });
    expect(deps.toast).toHaveBeenCalledWith(
      "Uploaded 1 to Uncategorized — 1 failed",
      "error",
    );
  });
});
