import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const adminFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin-fetch", () => ({
  adminFetch: adminFetchMock,
  AdminFetchError: class AdminFetchError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { BulkDeleteDialog } from "./bulk-delete-dialog";

const preview = {
  documentCount: 4,
  draftCount: 2,
  favoriteCount: 1,
  recentCount: 3,
  crossSectionCount: 0,
};

describe("BulkDeleteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminFetchMock.mockResolvedValue(preview);
  });

  it("loads the preview and shows the document count", async () => {
    render(
      <BulkDeleteDialog open onClose={() => {}} onDeleted={() => {}} categories={[]} />,
    );
    await waitFor(() =>
      expect(screen.getByText(/4 documents/i)).toBeInTheDocument(),
    );
  });

  it("keeps confirm disabled until 'DELETE ALL' is typed", async () => {
    render(
      <BulkDeleteDialog open onClose={() => {}} onDeleted={() => {}} categories={[]} />,
    );
    await waitFor(() => screen.getByText(/4 documents/i));
    const confirm = screen.getByRole("button", { name: /delete permanently/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("DELETE ALL"), {
      target: { value: "DELETE ALL" },
    });
    expect(confirm).toBeEnabled();
  });

  it("calls onDeleted after a successful delete", async () => {
    const onDeleted = vi.fn();
    adminFetchMock
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ success: true, documentCount: 4 });
    render(
      <BulkDeleteDialog open onClose={() => {}} onDeleted={onDeleted} categories={[]} />,
    );
    await waitFor(() => screen.getByText(/4 documents/i));
    fireEvent.change(screen.getByPlaceholderText("DELETE ALL"), {
      target: { value: "DELETE ALL" },
    });
    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));
    await waitFor(() =>
      expect(onDeleted).toHaveBeenCalledWith({ success: true, documentCount: 4 }),
    );
  });
});
