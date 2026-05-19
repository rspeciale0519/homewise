import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UncategorizedList } from "./uncategorized-list";
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

function setup(over: Partial<Parameters<typeof UncategorizedList>[0]> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <UncategorizedList docs={[doc]} onEdit={onEdit} onDelete={onDelete} {...over} />,
  );
  return { onEdit, onDelete };
}

describe("UncategorizedList", () => {
  it("shows an empty state when there are no docs", () => {
    setup({ docs: [] });
    expect(screen.getByText(/nothing uncategorized/i)).toBeInTheDocument();
  });
  it("lists each document name", () => {
    setup();
    expect(screen.getByText("Loose Doc")).toBeInTheDocument();
  });
  it("fires onEdit and onDelete", () => {
    const { onEdit, onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: /categorize/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onEdit).toHaveBeenCalledWith(doc);
    expect(onDelete).toHaveBeenCalledWith(doc);
  });
});
