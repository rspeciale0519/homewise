import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DragOverlay } from "./drag-overlay";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  AdminUncategorizedDoc,
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

describe("DragOverlay", () => {
  it("renders nothing when nothing is being dragged", () => {
    const { container } = render(
      <DragOverlay
        activeDragDoc={null}
        activeDragCategory={null}
        activeDragUncategorizedDocs={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the category title when activeDragCategory is set", () => {
    render(
      <DragOverlay
        activeDragDoc={null}
        activeDragCategory={minimalCategory}
        activeDragUncategorizedDocs={[]}
      />,
    );
    expect(screen.getByText("My Category")).toBeInTheDocument();
  });

  it("renders the document preview card when activeDragDoc is set", () => {
    render(
      <DragOverlay
        activeDragDoc={minimalDoc}
        activeDragCategory={null}
        activeDragUncategorizedDocs={[]}
      />,
    );
    expect(screen.getByText("Sample Doc")).toBeInTheDocument();
  });

  it("renders single doc name when bulk drag has exactly 1 doc", () => {
    render(
      <DragOverlay
        activeDragDoc={null}
        activeDragCategory={null}
        activeDragUncategorizedDocs={[makeUncat("u1", "Lonely Doc")]}
      />,
    );
    expect(screen.getByText("Lonely Doc")).toBeInTheDocument();
  });

  it("renders the primary doc name + count badge + '+N more' for multi-doc drag", () => {
    render(
      <DragOverlay
        activeDragDoc={null}
        activeDragCategory={null}
        activeDragUncategorizedDocs={[
          makeUncat("u1", "Doc A"),
          makeUncat("u2", "Doc B"),
          makeUncat("u3", "Doc C"),
        ]}
      />,
    );
    expect(screen.getByText("Doc A")).toBeInTheDocument();
    expect(screen.getByText(/\+ 2 more/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("bulk preview takes precedence over single-doc and category previews", () => {
    render(
      <DragOverlay
        activeDragDoc={minimalDoc}
        activeDragCategory={minimalCategory}
        activeDragUncategorizedDocs={[
          makeUncat("u1", "Doc A"),
          makeUncat("u2", "Doc B"),
        ]}
      />,
    );
    expect(screen.getByText("Doc A")).toBeInTheDocument();
    expect(screen.getByText(/\+ 1 more/i)).toBeInTheDocument();
    expect(screen.queryByText("Sample Doc")).not.toBeInTheDocument();
    expect(screen.queryByText("My Category")).not.toBeInTheDocument();
  });
});
