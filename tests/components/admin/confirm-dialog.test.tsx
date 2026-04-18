import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const baseProps = {
  open: true,
  title: "Delete Document",
  message: "This cannot be undone.",
  confirmLabel: "Delete permanently",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmDialog — basic mode (no typeToConfirm)", () => {
  it("renders title, message, confirm and cancel buttons", () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText("Delete Document")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDialog — typeToConfirm gate", () => {
  it("disables the confirm button until input matches exactly", () => {
    render(<ConfirmDialog {...baseProps} typeToConfirm="DELETE" />);
    const button = screen.getByRole("button", { name: "Delete permanently" });
    const input = screen.getByPlaceholderText("DELETE") as HTMLInputElement;

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "delete" } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "DELETE " } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(button).toBeEnabled();
  });

  it("fires onConfirm when Enter is pressed with a valid match", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog {...baseProps} onConfirm={onConfirm} typeToConfirm="DELETE" />,
    );
    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire onConfirm on Enter when input is invalid", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog {...baseProps} onConfirm={onConfirm} typeToConfirm="DELETE" />,
    );
    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "delete" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ConfirmDialog — busy state", () => {
  it("disables both buttons and shows loading label when busy", () => {
    render(
      <ConfirmDialog
        {...baseProps}
        typeToConfirm="DELETE"
        busy={true}
      />,
    );
    const confirmButton = screen.getByRole("button", { name: /Delete permanently/ });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(confirmButton.textContent).toMatch(/…/);
  });
});
