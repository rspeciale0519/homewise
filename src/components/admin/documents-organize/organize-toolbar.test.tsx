import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizeToolbar } from "./organize-toolbar";

function setup(overrides: Partial<Parameters<typeof OrganizeToolbar>[0]> = {}) {
  const onPreviewChange = vi.fn();
  const onSearchChange = vi.fn();
  const onAddDocument = vi.fn();
  render(
    <OrganizeToolbar
      preview={false}
      onPreviewChange={onPreviewChange}
      search=""
      onSearchChange={onSearchChange}
      onAddDocument={onAddDocument}
      {...overrides}
    />,
  );
  return { onPreviewChange, onSearchChange, onAddDocument };
}

describe("OrganizeToolbar", () => {
  it("fires onAddDocument when Add Document is clicked", () => {
    const { onAddDocument } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Add Document/ }));
    expect(onAddDocument).toHaveBeenCalledOnce();
  });

  it("hides Add Document button when preview is on", () => {
    setup({ preview: true });
    expect(
      screen.queryByRole("button", { name: /Add Document/ }),
    ).not.toBeInTheDocument();
  });

  it("fires onSearchChange when typing", () => {
    const { onSearchChange } = setup();
    fireEvent.change(screen.getByPlaceholderText("Search by name or slug…"), {
      target: { value: "lease" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("lease");
  });

  it("disables the search input when preview is on", () => {
    setup({ preview: true });
    expect(
      screen.getByPlaceholderText("Search by name or slug…"),
    ).toBeDisabled();
  });

  it("toggles preview on click", () => {
    const { onPreviewChange } = setup();
    fireEvent.click(screen.getByRole("switch"));
    expect(onPreviewChange).toHaveBeenCalledWith(true);
  });
});
