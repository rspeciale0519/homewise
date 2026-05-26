import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocumentSelection } from "./use-document-selection";

const ORDER: readonly string[] = ["a", "b", "c", "d", "e"];

describe("useDocumentSelection", () => {
  it("starts empty with isAllSelected=false and isIndeterminate=false", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it("plain click toggles a single id and sets anchor", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleOne("b", {}));
    expect(result.current.isSelected("b")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isIndeterminate).toBe(true);
    act(() => result.current.toggleOne("b", {}));
    expect(result.current.isSelected("b")).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("shift-click extends inclusive range from anchor down", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleOne("b", {}));
    act(() => result.current.toggleOne("d", { shiftKey: true }));
    expect(Array.from(result.current.selectedIds).sort()).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  it("shift-click extends inclusive range from anchor up", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleOne("d", {}));
    act(() => result.current.toggleOne("a", { shiftKey: true }));
    expect(Array.from(result.current.selectedIds).sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("ctrl-click toggles like plain click (preserves prior selection)", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleOne("a", {}));
    act(() => result.current.toggleOne("c", { ctrlKey: true }));
    expect(Array.from(result.current.selectedIds).sort()).toEqual(["a", "c"]);
  });

  it("toggleAll selects every visible id then deselects on second call", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleAll());
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.isIndeterminate).toBe(false);
    expect(result.current.selectedCount).toBe(5);
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(0);
  });

  it("isIndeterminate is true when some but not all are selected", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleOne("a", {}));
    act(() => result.current.toggleOne("b", { ctrlKey: true }));
    expect(result.current.isIndeterminate).toBe(true);
    expect(result.current.isAllSelected).toBe(false);
  });

  it("clear removes all selected ids and anchor", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleAll());
    act(() => result.current.clear());
    expect(result.current.selectedCount).toBe(0);
  });

  it("prunes selected ids when orderedDocIds changes (doc deleted)", () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: readonly string[] }) => useDocumentSelection(ids),
      { initialProps: { ids: ORDER } },
    );
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(5);
    rerender({ ids: ["a", "b", "c"] });
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("d")).toBe(false);
    expect(result.current.isSelected("e")).toBe(false);
  });

  it("shift-click without prior anchor falls back to single toggle", () => {
    const { result } = renderHook(() => useDocumentSelection(ORDER));
    act(() => result.current.toggleOne("c", { shiftKey: true }));
    expect(Array.from(result.current.selectedIds)).toEqual(["c"]);
  });
});
