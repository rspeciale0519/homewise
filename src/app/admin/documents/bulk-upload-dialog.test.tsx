import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const adminFetchMock = vi.hoisted(() => vi.fn());
const xhrPutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin-fetch", () => ({
  adminFetch: adminFetchMock,
  AdminFetchError: class extends Error {
    status: number;
    constructor(m: string, s: number) {
      super(m);
      this.status = s;
    }
  },
}));
vi.mock("@/lib/documents/bulk-upload", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/documents/bulk-upload")>();
  return { ...actual, xhrPut: xhrPutMock };
});

import { BulkUploadDialog } from "./bulk-upload-dialog";

function pdf(name: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}
function drop(files: File[]) {
  const input = screen.getByTestId("bulk-upload-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

describe("BulkUploadDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xhrPutMock.mockResolvedValue(undefined);
    adminFetchMock.mockImplementation((url: string) =>
      url.endsWith("/upload")
        ? Promise.resolve({
            uploadUrl: "https://signed",
            storageKey: "documents/k",
            storageProvider: "supabase",
          })
        : Promise.resolve({
            created: [{ id: "1", name: "a", slug: "a" }],
            failed: [],
          }),
    );
  });

  it("excludes invalid files with a reason and disables Upload", () => {
    render(<BulkUploadDialog open onClose={() => {}} onUploaded={() => {}} />);
    drop([new File(["x"], "bad.exe", { type: "application/pdf" })]);
    expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^upload/i })).toBeDisabled();
  });

  it("uploads valid files then calls onUploaded", async () => {
    const onUploaded = vi.fn();
    render(
      <BulkUploadDialog open onClose={() => {}} onUploaded={onUploaded} />,
    );
    drop([pdf("a.pdf")]);
    fireEvent.click(screen.getByRole("button", { name: /^upload/i }));
    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({
        created: [{ id: "1", name: "a", slug: "a" }],
        failed: [],
      }),
    );
    expect(xhrPutMock).toHaveBeenCalledTimes(1);
  });

  it("lets you remove a queued file", () => {
    render(<BulkUploadDialog open onClose={() => {}} onUploaded={() => {}} />);
    drop([pdf("a.pdf")]);
    expect(screen.getByDisplayValue("a")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove a\.pdf/i }));
    expect(screen.queryByDisplayValue("a")).not.toBeInTheDocument();
  });

  it("marks a file failed and offers Retry when its upload fails", async () => {
    xhrPutMock.mockRejectedValueOnce(new Error("Upload failed (500)"));
    render(<BulkUploadDialog open onClose={() => {}} onUploaded={() => {}} />);
    drop([pdf("a.pdf")]);
    fireEvent.click(screen.getByRole("button", { name: /^upload/i }));
    await waitFor(() =>
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /retry failed/i }),
    ).toBeInTheDocument();
  });
});
