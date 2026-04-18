import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentRowMenu } from "@/components/admin/document-row-menu";
import type { DocumentItem } from "@/app/admin/documents/types";

const makeDoc = (overrides: Partial<DocumentItem> = {}): DocumentItem => ({
  id: "doc-1",
  name: "Lead Paint Disclosure",
  slug: "lead-paint-disclosure",
  description: null,
  url: null,
  external: false,
  storageKey: "documents/abc-lead-paint-disclosure.pdf",
  storageProvider: "supabase",
  mimeType: "application/pdf",
  sizeBytes: 412000,
  sortOrder: 0,
  published: true,
  quickAccess: false,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  categories: [],
  ...overrides,
});

// NOTE: Radix DropdownMenu relies on pointer events that jsdom doesn't fully
// emulate, so we don't test the open-menu + click-Delete flow here. That path
// is covered by the manual Playwright verification in Phase 3.3. The tests
// below focus on the parts of DocumentRowMenu we own: the trigger's a11y
// label and the stopPropagation contract with the parent row.

describe("DocumentRowMenu", () => {
  it("renders trigger with a document-specific aria-label", () => {
    render(
      <DocumentRowMenu
        document={makeDoc()}
        onRequestDelete={vi.fn()}
        onToggleQuickAccess={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Actions for Lead Paint Disclosure" }),
    ).toBeInTheDocument();
  });

  it("reflects the document name in the aria-label", () => {
    render(
      <DocumentRowMenu
        document={makeDoc({ name: "Broker Relationship Disclosure" })}
        onRequestDelete={vi.fn()}
        onToggleQuickAccess={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Actions for Broker Relationship Disclosure" }),
    ).toBeInTheDocument();
  });

  it("stops trigger clicks from propagating to parent handlers", () => {
    const parentClick = vi.fn();
    const { container } = render(
      <div onClick={parentClick}>
        <DocumentRowMenu
          document={makeDoc()}
          onRequestDelete={vi.fn()}
          onToggleQuickAccess={vi.fn()}
        />
      </div>,
    );
    const trigger = container.querySelector(
      'button[aria-label^="Actions for"]',
    ) as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
