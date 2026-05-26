import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSectionDragEnd } from "./use-section-drag-end";
import type { DragEndEvent } from "@dnd-kit/core";

function makeEvent(
  activeData: Record<string, unknown> | undefined,
  overData: Record<string, unknown> | undefined,
): DragEndEvent {
  return {
    active: {
      id: "active",
      data: { current: activeData },
      rect: { current: { initial: null, translated: null } },
    },
    over: overData
      ? {
          id: "over",
          rect: {} as DOMRect,
          data: { current: overData },
          disabled: false,
        }
      : null,
    collisions: [],
    delta: { x: 0, y: 0 },
    activatorEvent: new Event("test"),
  } as unknown as DragEndEvent;
}

describe("useSectionDragEnd", () => {
  it("ignores events without active section-bulk data", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        { type: "document", documentId: "d1", fromCategoryId: "c1" },
        { type: "section-tab-drop", section: "listing" },
      ),
    );
    expect(cb).not.toHaveBeenCalled();
  });

  it("ignores events without an over target", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        {
          type: "section-bulk",
          documentIds: ["d1"],
          fromSection: "office",
        },
        undefined,
      ),
    );
    expect(cb).not.toHaveBeenCalled();
  });

  it("ignores section-bulk drops with no documentIds", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        { type: "section-bulk", documentIds: [], fromSection: "office" },
        { type: "section-tab-drop", section: "listing" },
      ),
    );
    expect(cb).not.toHaveBeenCalled();
  });

  it("routes a drop on a section tab as kind=tab", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        {
          type: "section-bulk",
          documentIds: ["d1", "d2"],
          fromSection: "office",
        },
        { type: "section-tab-drop", section: "listing" },
      ),
    );
    expect(cb).toHaveBeenCalledWith({
      kind: "tab",
      fromSection: "office",
      toSection: "listing",
      documentIds: ["d1", "d2"],
    });
  });

  it("routes a drop on a category-drop wrapper as kind=category", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        {
          type: "section-bulk",
          documentIds: ["d1"],
          fromSection: "office",
        },
        { type: "category-drop", categoryId: "cat-xyz" },
      ),
    );
    expect(cb).toHaveBeenCalledWith({
      kind: "category",
      fromSection: "office",
      toCategoryId: "cat-xyz",
      documentIds: ["d1"],
    });
  });

  it("routes a drop on a sibling document card to its fromCategoryId", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        {
          type: "section-bulk",
          documentIds: ["d1"],
          fromSection: "office",
        },
        { type: "document", documentId: "d9", fromCategoryId: "cat-target" },
      ),
    );
    expect(cb).toHaveBeenCalledWith({
      kind: "category",
      fromSection: "office",
      toCategoryId: "cat-target",
      documentIds: ["d1"],
    });
  });

  it("routes a drop on an empty-category placeholder", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        {
          type: "section-bulk",
          documentIds: ["d1"],
          fromSection: "sales",
        },
        { type: "empty-category", categoryId: "cat-empty" },
      ),
    );
    expect(cb).toHaveBeenCalledWith({
      kind: "category",
      fromSection: "sales",
      toCategoryId: "cat-empty",
      documentIds: ["d1"],
    });
  });

  it("ignores section-bulk drops on unrelated drop types", () => {
    const cb = vi.fn();
    const { result } = renderHook(() =>
      useSectionDragEnd({ onSectionBulkDrop: cb }),
    );
    result.current(
      makeEvent(
        {
          type: "section-bulk",
          documentIds: ["d1"],
          fromSection: "office",
        },
        { type: "something-else" },
      ),
    );
    expect(cb).not.toHaveBeenCalled();
  });
});
