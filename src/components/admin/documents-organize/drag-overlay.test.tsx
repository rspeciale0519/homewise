import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragOverlay } from "./drag-overlay";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
} from "@/app/admin/documents/types";

const minimalDoc: AdminDocumentInCategory = {
  id: "doc-1",
  slug: "doc-1",
  name: "Sample Doc",
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

const minimalCategory: AdminCategoryTree = {
  id: "cat-1",
  slug: "cat-1",
  title: "My Category",
  description: null,
  section: "office",
  sortOrder: 0,
  documents: [],
};

describe("DragOverlay", () => {
  it("renders nothing when both props are null", () => {
    const { container } = render(
      <DragOverlay activeDragDoc={null} activeDragCategory={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the category title when activeDragCategory is set", () => {
    render(
      <DragOverlay
        activeDragDoc={null}
        activeDragCategory={minimalCategory}
      />,
    );
    expect(screen.getByText("My Category")).toBeInTheDocument();
  });

  it("renders the document preview card when activeDragDoc is set", () => {
    render(
      <DragOverlay
        activeDragDoc={minimalDoc}
        activeDragCategory={null}
      />,
    );
    expect(screen.getByText("Sample Doc")).toBeInTheDocument();
  });

  it("prefers activeDragDoc over activeDragCategory when both are set", () => {
    render(
      <DragOverlay
        activeDragDoc={minimalDoc}
        activeDragCategory={minimalCategory}
      />,
    );
    expect(screen.getByText("Sample Doc")).toBeInTheDocument();
    expect(screen.queryByText("My Category")).not.toBeInTheDocument();
  });
});
