import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { DocumentCard } from "./document-card";
import type { AdminDocumentInCategory } from "@/app/admin/documents/types";

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

function renderCard(
  overrides: Partial<Parameters<typeof DocumentCard>[0]> = {},
) {
  const noop = vi.fn();
  const props = {
    document: baseDoc,
    currentCategoryId: "cat-a",
    preview: false,
    searchMatches: true,
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

  it("exposes drag handle with an a11y label", () => {
    renderCard();
    expect(
      screen.getByRole("button", {
        name: "Drag to reorder Purchase Agreement",
      }),
    ).toBeInTheDocument();
  });

  it("hides drag handle in preview mode", () => {
    renderCard({ preview: true });
    expect(
      screen.queryByRole("button", {
        name: "Drag to reorder Purchase Agreement",
      }),
    ).not.toBeInTheDocument();
  });

  it("hides ellipsis menu in preview mode", () => {
    renderCard({ preview: true });
    expect(
      screen.queryByRole("button", {
        name: "Actions for Purchase Agreement",
      }),
    ).not.toBeInTheDocument();
  });
});
