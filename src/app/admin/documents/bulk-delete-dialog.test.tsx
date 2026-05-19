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
import { AdminFetchError } from "@/lib/admin-fetch";
import { CONFIRMATION_PHRASE } from "@/lib/documents/bulk-delete";

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
    fireEvent.change(screen.getByPlaceholderText(CONFIRMATION_PHRASE), {
      target: { value: CONFIRMATION_PHRASE },
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
    fireEvent.change(screen.getByPlaceholderText(CONFIRMATION_PHRASE), {
      target: { value: CONFIRMATION_PHRASE },
    });
    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));
    await waitFor(() =>
      expect(onDeleted).toHaveBeenCalledWith({ success: true, documentCount: 4 }),
    );
  });

  it("clears the phrase and reloads the preview on a 409", async () => {
    const onDeleted = vi.fn();
    let resolveReload!: (v: typeof preview & { documentCount: number }) => void;
    const reloadPromise = new Promise<typeof preview & { documentCount: number }>((res) => {
      resolveReload = res;
    });
    adminFetchMock
      .mockResolvedValueOnce(preview)
      .mockRejectedValueOnce(new AdminFetchError("scope changed", 409))
      .mockReturnValueOnce(reloadPromise);
    render(
      <BulkDeleteDialog open onClose={() => {}} onDeleted={onDeleted} categories={[]} />,
    );
    await waitFor(() => screen.getByText(/4 documents/i));
    fireEvent.change(screen.getByPlaceholderText(CONFIRMATION_PHRASE), {
      target: { value: CONFIRMATION_PHRASE },
    });
    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));
    await waitFor(() =>
      expect(screen.getByText(/library changed/i)).toBeInTheDocument(),
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(
      (screen.getByPlaceholderText(CONFIRMATION_PHRASE) as HTMLInputElement)
        .value,
    ).toBe("");
    resolveReload({ ...preview, documentCount: 9 });
    await waitFor(() =>
      expect(screen.getByText(/9 documents/i)).toBeInTheDocument(),
    );
  });
});
