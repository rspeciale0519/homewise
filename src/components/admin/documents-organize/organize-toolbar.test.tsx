import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizeToolbar } from "./organize-toolbar";

function setup(preview = false) {
  const onBulkDelete = vi.fn();
  render(
    <OrganizeToolbar
      preview={preview}
      onPreviewChange={() => {}}
      search=""
      onSearchChange={() => {}}
      onAddDocument={() => {}}
      onBulkDelete={onBulkDelete}
    />,
  );
  return { onBulkDelete };
}

describe("OrganizeToolbar", () => {
  it("calls onBulkDelete when the Bulk delete button is clicked", () => {
    const { onBulkDelete } = setup(false);
    fireEvent.click(screen.getByRole("button", { name: /bulk delete/i }));
    expect(onBulkDelete).toHaveBeenCalledOnce();
  });

  it("hides Bulk delete in preview mode", () => {
    setup(true);
    expect(
      screen.queryByRole("button", { name: /bulk delete/i }),
    ).not.toBeInTheDocument();
  });
});
