import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionTabs } from "./section-tabs";

describe("SectionTabs", () => {
  it("renders counts and fires onSelect", () => {
    const onSelect = vi.fn();
    render(
      <SectionTabs
        tabs={[
          { key: "office", label: "Office" },
          { key: "uncategorized", label: "Uncategorized" },
        ]}
        activeTab="office"
        onSelect={onSelect}
        counts={{ office: 3, listing: 0, sales: 0, uncategorized: 7 }}
      />,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /uncategorized/i }));
    expect(onSelect).toHaveBeenCalledWith("uncategorized");
  });
});
