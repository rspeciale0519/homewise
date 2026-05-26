import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { DocumentCard } from "./document-card";
import type { AdminDocumentInCategory } from "@/app/admin/documents/types";
import type { UseDocumentSelectionResult } from "@/app/admin/documents/use-document-selection";

const baseDoc: AdminDocumentInCategory = {
  id: "doc-1",
  slug: "doc-1",
  name: "Purchase Agreement",
  description: null,
  published: true,
  quickAccess: false,
  external: false,
  url: null,
  storageKey: "doc-1.pdf",
  storageProvider: "supabase",
  mimeType: "application/pdf",
  membership: { categoryId: "cat-a", sortOrder: 0 },
};

function stubSelection(
  overrides: Partial<UseDocumentSelectionResult> = {},
): UseDocumentSelectionResult {
  return {
    selectedIds: new Set<string>(),
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

function renderCard(
  overrides: Partial<Parameters<typeof DocumentCard>[0]> = {},
) {
  const noop = vi.fn();
  const props = {
    document: baseDoc,
    currentCategoryId: "cat-a",
    preview: false,
    searchMatches: true,
    selection: stubSelection(),
    selectionActive: false,
    targetCategories: { office: [], listing: [], sales: [] },
    onCardClick: noop,
    onEdit: noop,
    onTogglePublish: noop,
    onToggleQuickAccess: noop,
    onMoveTo: noop,
    onOpenInViewer: noop,
    onDelete: noop,
    ...overrides,
  };
  return render(
    <DndContext>
      <SortableContext
        items={[`doc::${props.currentCategoryId}::${props.document.id}`]}
      >
        <DocumentCard {...props} />
      </SortableContext>
    </DndContext>,
  );
}

describe("DocumentCard", () => {
  it("renders document name and ellipsis trigger", () => {
    renderCard();
    expect(screen.getByText("Purchase Agreement")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Actions for Purchase Agreement" }),
    ).toBeInTheDocument();
  });

  it("shows Draft pill when unpublished", () => {
    renderCard({ document: { ...baseDoc, published: false } });
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("hides Draft pill in preview mode", () => {
    renderCard({
      document: { ...baseDoc, published: false },
      preview: true,
    });
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("shows Quick pill when quickAccess is true", () => {
    renderCard({ document: { ...baseDoc, quickAccess: true } });
    expect(screen.getByText("Quick")).toBeInTheDocument();
  });

  it("exposes a select-card checkbox with an a11y label", () => {
    renderCard();
    expect(
      screen.getByRole("checkbox", { name: "Select Purchase Agreement" }),
    ).toBeInTheDocument();
  });

  it("hides selection checkbox in preview mode", () => {
    renderCard({ preview: true });
    expect(
      screen.queryByRole("checkbox", { name: /Purchase Agreement/ }),
    ).not.toBeInTheDocument();
  });

  it("renders card root as a button in edit mode", () => {
    renderCard();
    expect(
      screen.getAllByRole("button").some(
        (el) => el.textContent?.includes("Purchase Agreement"),
      ),
    ).toBe(true);
  });

  it("renders card root as a link in preview mode", () => {
    renderCard({ preview: true });
    expect(
      screen.getAllByRole("link").some(
        (el) => el.textContent?.includes("Purchase Agreement"),
      ),
    ).toBe(true);
  });

  it("hides ellipsis menu in preview mode", () => {
    renderCard({ preview: true });
    expect(
      screen.queryByRole("button", {
        name: "Actions for Purchase Agreement",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows the Deselect label when card is selected", () => {
    renderCard({
      selection: stubSelection({
        selectedIds: new Set(["doc-1"]),
        selectedCount: 1,
        isSelected: (id) => id === "doc-1",
      }),
      selectionActive: true,
    });
    expect(
      screen.getByRole("checkbox", { name: "Deselect Purchase Agreement" }),
    ).toBeInTheDocument();
  });
});
