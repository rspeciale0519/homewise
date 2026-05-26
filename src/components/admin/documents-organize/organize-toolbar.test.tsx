import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizeToolbar } from "./organize-toolbar";

function setup(overrides: Partial<Parameters<typeof OrganizeToolbar>[0]> = {}) {
  const onPreviewChange = vi.fn();
  const onSearchChange = vi.fn();
  const onAddDocument = vi.fn();
  const onBulkDelete = vi.fn();
  const onBulkUpload = vi.fn();
  const onAutoSwitchChange = vi.fn();
  const onMoveSelection = vi.fn();
  const onClearSelection = vi.fn();
  render(
    <OrganizeToolbar
      preview={false}
      onPreviewChange={onPreviewChange}
      search=""
      onSearchChange={onSearchChange}
      onAddDocument={onAddDocument}
      onBulkDelete={onBulkDelete}
      onBulkUpload={onBulkUpload}
      autoSwitch={true}
      onAutoSwitchChange={onAutoSwitchChange}
      selectionCount={0}
      onMoveSelection={onMoveSelection}
      onClearSelection={onClearSelection}
      {...overrides}
    />,
  );
  return {
    onPreviewChange,
    onSearchChange,
    onAddDocument,
    onBulkDelete,
    onBulkUpload,
    onAutoSwitchChange,
    onMoveSelection,
    onClearSelection,
  };
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
    fireEvent.click(screen.getByRole("switch", { name: /preview as agent/i }));
    expect(onPreviewChange).toHaveBeenCalledWith(true);
  });

  it("fires onBulkDelete when the Bulk delete button is clicked", () => {
    const { onBulkDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: /bulk delete/i }));
    expect(onBulkDelete).toHaveBeenCalledOnce();
  });

  it("hides the Bulk delete button when preview is on", () => {
    setup({ preview: true });
    expect(
      screen.queryByRole("button", { name: /bulk delete/i }),
    ).not.toBeInTheDocument();
  });

  it("fires onBulkUpload when Bulk upload is clicked", () => {
    const { onBulkUpload } = setup();
    fireEvent.click(screen.getByRole("button", { name: /bulk upload/i }));
    expect(onBulkUpload).toHaveBeenCalledOnce();
  });

  it("hides Bulk upload in preview mode", () => {
    setup({ preview: true });
    expect(
      screen.queryByRole("button", { name: /bulk upload/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the auto-switch toggle and forwards changes", () => {
    const { onAutoSwitchChange } = setup({ autoSwitch: true });
    const toggle = screen.getByRole("switch", { name: /auto-switch to destination tab/i });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(onAutoSwitchChange).toHaveBeenCalledWith(false);
  });

  it("hides auto-switch toggle in preview mode", () => {
    setup({ preview: true });
    expect(
      screen.queryByRole("switch", { name: /auto-switch to destination tab/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the Move button when selectionCount is 0", () => {
    setup({ selectionCount: 0 });
    expect(
      screen.queryByRole("button", { name: /^move /i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^clear$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Move N… and Clear when selectionCount > 0", () => {
    setup({ selectionCount: 3 });
    expect(screen.getByRole("button", { name: /^move 3…$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^clear$/i })).toBeInTheDocument();
  });

  it("fires onMoveSelection and onClearSelection from those buttons", () => {
    const { onMoveSelection, onClearSelection } = setup({ selectionCount: 2 });
    fireEvent.click(screen.getByRole("button", { name: /^move 2…$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(onMoveSelection).toHaveBeenCalledOnce();
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it("hides the Move button in preview mode even with a selection", () => {
    setup({ preview: true, selectionCount: 5 });
    expect(
      screen.queryByRole("button", { name: /^move /i }),
    ).not.toBeInTheDocument();
  });
});
