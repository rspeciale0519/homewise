import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SectionTabs } from "./section-tabs";

function renderWithDnd(ui: React.ReactNode) {
  return render(<DndContext>{ui}</DndContext>);
}

describe("SectionTabs", () => {
  it("renders counts and fires onSelect", () => {
    const onSelect = vi.fn();
    renderWithDnd(
      <SectionTabs
        tabs={[
          { key: "office", label: "Office" },
          { key: "uncategorized", label: "Uncategorized" },
        ]}
        activeTab="office"
        onSelect={onSelect}
        counts={{ office: 3, listing: 0, sales: 0, uncategorized: 7 }}
        acceptsBulkDrop={false}
      />,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /uncategorized/i }));
    expect(onSelect).toHaveBeenCalledWith("uncategorized");
  });

  it("still fires onSelect when acceptsBulkDrop is true (tabs remain clickable)", () => {
    const onSelect = vi.fn();
    renderWithDnd(
      <SectionTabs
        tabs={[
          { key: "office", label: "Office" },
          { key: "listing", label: "Listing" },
          { key: "uncategorized", label: "Uncategorized" },
        ]}
        activeTab="uncategorized"
        onSelect={onSelect}
        counts={{ office: 1, listing: 2, sales: 0, uncategorized: 5 }}
        acceptsBulkDrop={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /listing/i }));
    expect(onSelect).toHaveBeenCalledWith("listing");
  });
});
