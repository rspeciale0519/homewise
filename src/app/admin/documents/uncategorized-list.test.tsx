import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UncategorizedList } from "./uncategorized-list";
import type { AdminUncategorizedDoc } from "./types";
import type { UseUncategorizedSelectionResult } from "./use-uncategorized-selection";

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

function mockSelection(
  overrides: Partial<UseUncategorizedSelectionResult> = {},
): UseUncategorizedSelectionResult {
  return {
    selectedIds: new Set(),
    isSelected: () => false,
    isAllSelected: false,
    isIndeterminate: false,
    selectedCount: 0,
    toggleOne: vi.fn(),
    toggleAll: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  };
}

function setup(
  over: Partial<Parameters<typeof UncategorizedList>[0]> = {},
  selection: UseUncategorizedSelectionResult = mockSelection(),
) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <UncategorizedList
      docs={[doc]}
      selection={selection}
      onEdit={onEdit}
      onDelete={onDelete}
      {...over}
    />,
  );
  return { onEdit, onDelete, selection };
}

describe("UncategorizedList", () => {
  it("shows an empty state when there are no docs", () => {
    setup({ docs: [] });
    expect(screen.getByText(/nothing uncategorized/i)).toBeInTheDocument();
  });

  it("lists each document name with listbox semantics", () => {
    setup();
    expect(screen.getByText("Loose Doc")).toBeInTheDocument();
    const listbox = screen.getByRole("listbox", {
      name: /loose documents pending triage/i,
    });
    expect(listbox).toBeInTheDocument();
    expect(listbox.getAttribute("aria-multiselectable")).toBe("true");
    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "false");
  });

  it("fires onEdit and onDelete", () => {
    const { onEdit, onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^categorize$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete loose doc$/i }));
    expect(onEdit).toHaveBeenCalledWith(doc);
    expect(onDelete).toHaveBeenCalledWith(doc);
  });

  it("calls toggleOne with modifier keys when row checkbox is clicked", () => {
    const { selection } = setup();
    const toggle = screen.getByRole("checkbox", {
      name: /^select loose doc$/i,
    });
    fireEvent.click(toggle, { shiftKey: true });
    expect(selection.toggleOne).toHaveBeenCalledWith("u1", {
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
    });
  });

  it("calls toggleAll when header checkbox is clicked", () => {
    const { selection } = setup();
    const headerCheckbox = screen.getByRole("checkbox", {
      name: /^select all$/i,
    });
    fireEvent.click(headerCheckbox);
    expect(selection.toggleAll).toHaveBeenCalled();
  });

  it("shows the selection count text when some are selected", () => {
    setup(
      {},
      mockSelection({
        selectedIds: new Set(["u1"]),
        isSelected: (id) => id === "u1",
        isIndeterminate: true,
        selectedCount: 1,
      }),
    );
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it("marks the row aria-selected=true when its id is in selection", () => {
    setup(
      {},
      mockSelection({
        selectedIds: new Set(["u1"]),
        isSelected: (id) => id === "u1",
        isIndeterminate: true,
        selectedCount: 1,
      }),
    );
    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true");
  });
});
