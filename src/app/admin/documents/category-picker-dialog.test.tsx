import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryPickerDialog } from "./category-picker-dialog";
import type { AdminCategoryTree, DocumentSection } from "./types";

function makeCat(id: string, title: string, section: DocumentSection): AdminCategoryTree {
  return {
    id,
    slug: id,
    title,
    description: null,
    section,
    sortOrder: 0,
    documents: [],
  };
}

const SECTIONS_TO_CATEGORIES = {
  office: [makeCat("o1", "Office Cat A", "office"), makeCat("o2", "Office Cat B", "office")],
  listing: [makeCat("l1", "Listing Cat A", "listing")],
  sales: [],
} satisfies Record<DocumentSection, AdminCategoryTree[]>;

function setup(over: Partial<Parameters<typeof CategoryPickerDialog>[0]> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  const utils = render(
    <CategoryPickerDialog
      open
      documentCount={3}
      sectionsToCategories={SECTIONS_TO_CATEGORIES}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...over}
    />,
  );
  return { onCancel, onConfirm, ...utils };
}

describe("CategoryPickerDialog — drag path (section provided)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("skips section step and shows category list immediately", () => {
    setup({ section: "office" });
    expect(screen.getByText(/move 3 documents to office/i)).toBeInTheDocument();
    expect(screen.getByText("Office Cat A")).toBeInTheDocument();
    expect(screen.queryByText(/step 1 of 2/i)).not.toBeInTheDocument();
  });

  it("Assign button is disabled when no category is picked yet", () => {
    setup({ section: "office" });
    const btn = screen.getByRole("button", { name: /^assign 3$/i });
    expect(btn).toBeDisabled();
  });

  it("calls onConfirm with the picked category and writes sessionStorage", () => {
    const { onConfirm } = setup({ section: "office" });
    fireEvent.click(screen.getByRole("radio", { name: /office cat b/i }));
    fireEvent.click(screen.getByRole("button", { name: /^assign 3$/i }));
    expect(onConfirm).toHaveBeenCalledWith({
      section: "office",
      categoryId: "o2",
      categoryTitle: "Office Cat B",
    });
    const stored = JSON.parse(
      window.sessionStorage.getItem("homewise.organize.lastCategory") ?? "{}",
    );
    expect(stored.office).toBe("o2");
  });

  it("pre-selects the last-used category from sessionStorage if it still exists", () => {
    window.sessionStorage.setItem(
      "homewise.organize.lastCategory",
      JSON.stringify({ office: "o2" }),
    );
    setup({ section: "office" });
    const radio = screen.getByRole("radio", { name: /office cat b/i });
    expect(radio.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: /^assign 3$/i })).toBeEnabled();
  });

  it("does NOT pre-select when the remembered id no longer exists in the section", () => {
    window.sessionStorage.setItem(
      "homewise.organize.lastCategory",
      JSON.stringify({ office: "ghost" }),
    );
    setup({ section: "office" });
    expect(screen.getByRole("button", { name: /^assign 3$/i })).toBeDisabled();
  });

  it("renders empty-state copy when the section has no categories", () => {
    setup({ section: "sales" });
    expect(
      screen.getByText(/no categories in this section yet/i),
    ).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const { onCancel } = setup({ section: "office" });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("uses singular 'Assign' when documentCount is 1", () => {
    setup({ section: "office", documentCount: 1 });
    expect(
      screen.getByRole("button", { name: /^assign$/i }),
    ).toBeInTheDocument();
  });
});

describe("CategoryPickerDialog — button path (no section provided)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows section step first", () => {
    setup();
    expect(screen.getByText(/step 1 of 2 — pick a section/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /office.*categories/i })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("advances to category step after picking a section", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /listing.*category/i }));
    expect(screen.getByText("Listing Cat A")).toBeInTheDocument();
    expect(
      screen.getByText(/move 3 documents to listing/i),
    ).toBeInTheDocument();
  });

  it("Back button returns to section step from category step", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /office.*categories/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();
  });

  it("sections with zero categories are disabled in the section step", () => {
    setup();
    const salesBtn = screen.getByRole("button", { name: /sales.*0 categories/i });
    expect(salesBtn).toBeDisabled();
  });
});
