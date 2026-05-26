import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useUncategorizedSelection,
  type UseUncategorizedSelectionResult,
} from "./use-uncategorized-selection";
import { useDocumentSelection } from "./use-document-selection";

// This file remains to verify the backward-compatible alias still resolves to
// the canonical hook. Full behavior is covered by use-document-selection.test.ts.

describe("useUncategorizedSelection alias", () => {
  it("re-exports the same hook as useDocumentSelection", () => {
    expect(useUncategorizedSelection).toBe(useDocumentSelection);
  });

  it("returns a working selection state through the alias", () => {
    const { result } = renderHook(() =>
      useUncategorizedSelection(["a", "b", "c"]),
    );
    act(() => result.current.toggleOne("a", {}));
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected("a")).toBe(true);
  });

  it("UseUncategorizedSelectionResult type matches the alias", () => {
    // Compile-time check via assignment
    const sample: UseUncategorizedSelectionResult = {
      selectedIds: new Set(),
      isSelected: () => false,
      isAllSelected: false,
      isIndeterminate: false,
      selectedCount: 0,
      toggleOne: () => {},
      toggleAll: () => {},
      clear: () => {},
    };
    expect(sample.selectedCount).toBe(0);
  });
});
