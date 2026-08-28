import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  createBucket: vi.fn(),
  download: vi.fn(),
  from: vi.fn(),
  info: vi.fn(),
  list: vi.fn(),
  listBuckets: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      createBucket: storageMocks.createBucket,
      from: storageMocks.from,
      listBuckets: storageMocks.listBuckets,
    },
  }),
}));

import {
  DirectMailFileValidationError,
  artworkContentError,
  artworkUploadAttemptKeyFor,
  createSignedUploadUrl,
  downloadObjectWithinLimit,
  fileNameMatchesMime,
  isSubmittedFileKeyForOrder,
  listUploadAttemptKeyFor,
  parseArtworkUploadAttemptKey,
  parseListUploadAttemptKey,
  removeOrderFiles,
  submittedFileKeyFor,
  submittedPrefixFor,
  uploadCreateOnlyAtKey,
} from "./storage";

const ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("direct-mail immutable storage keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.listBuckets.mockResolvedValue({
      data: [{ name: "direct-mail-orders" }],
      error: null,
    });
    storageMocks.createSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.test/upload", token: "token" },
      error: null,
    });
    storageMocks.upload.mockResolvedValue({ data: { path: "stored" }, error: null });
    storageMocks.list.mockResolvedValue({ data: [], error: null });
    storageMocks.remove.mockResolvedValue({ data: [], error: null });
    storageMocks.from.mockReturnValue({
      createSignedUploadUrl: storageMocks.createSignedUploadUrl,
      download: storageMocks.download,
      info: storageMocks.info,
      list: storageMocks.list,
      remove: storageMocks.remove,
      upload: storageMocks.upload,
    });
  });

  it("rejects forged cross-order upload keys", () => {
    const artworkKey = artworkUploadAttemptKeyFor(
      "order-a",
      "artwork-1",
      128,
      "pdf",
      ATTEMPT_ID,
    );
    const listKey = listUploadAttemptKeyFor("order-a", "list-1", 256, ATTEMPT_ID);

    expect(parseArtworkUploadAttemptKey(artworkKey, "order-b", "artwork-1", "pdf")).toBeNull();
    expect(parseArtworkUploadAttemptKey(artworkKey, "order-a", "artwork-2", "pdf")).toBeNull();
    expect(parseListUploadAttemptKey(listKey, "order-b", "list-1")).toBeNull();
    expect(parseListUploadAttemptKey(listKey, "order-a", "list-2")).toBeNull();
  });

  it("rejects understated sizes before downloading the object", async () => {
    storageMocks.info.mockResolvedValueOnce({
      data: { size: 20, contentType: "application/pdf" },
      error: null,
    });

    await expect(downloadObjectWithinLimit("order/file.pdf", 50, 10)).rejects.toMatchObject({
      name: "DirectMailFileValidationError",
      status: 400,
    });
    expect(storageMocks.download).not.toHaveBeenCalled();
  });

  it("enforces the hard maximum before downloading the object", async () => {
    storageMocks.info.mockResolvedValueOnce({
      data: { size: 51, contentType: "application/pdf" },
      error: null,
    });

    await expect(downloadObjectWithinLimit("order/file.pdf", 50)).rejects.toEqual(
      expect.objectContaining<Partial<DirectMailFileValidationError>>({ status: 413 }),
    );
    expect(storageMocks.download).not.toHaveBeenCalled();
  });

  it("prevents mutable-key reuse for signed uploads", async () => {
    const generatedFirst = artworkUploadAttemptKeyFor("order-a", "artwork-1", 128, "pdf");
    const generatedSecond = artworkUploadAttemptKeyFor("order-a", "artwork-1", 128, "pdf");
    const first = artworkUploadAttemptKeyFor("order-a", "artwork-1", 128, "pdf", ATTEMPT_ID);

    expect(generatedFirst).not.toBe(generatedSecond);
    expect(parseArtworkUploadAttemptKey(first, "order-a", "artwork-1", "pdf")).toEqual({
      attemptId: ATTEMPT_ID,
      expectedByteSize: 128,
    });

    await createSignedUploadUrl(first);
    expect(storageMocks.createSignedUploadUrl).toHaveBeenCalledWith(first, { upsert: false });
  });

  it("generates unguessable submitted prefixes and create-only sealed keys", async () => {
    const generatedFirst = submittedPrefixFor("order-a");
    const generatedSecond = submittedPrefixFor("order-a");
    const firstPrefix = submittedPrefixFor("order-a", ATTEMPT_ID);
    const sealedKey = submittedFileKeyFor(firstPrefix, "artwork", "artwork-1", "pdf");

    expect(generatedFirst).not.toBe(generatedSecond);
    expect(sealedKey).toBe(`order-a/submitted-${ATTEMPT_ID}-artwork-artwork-1.pdf`);
    expect(isSubmittedFileKeyForOrder(sealedKey, "order-a")).toBe(true);
    expect(isSubmittedFileKeyForOrder(sealedKey, "order-b")).toBe(false);

    const summaryKey = submittedFileKeyFor(firstPrefix, "summary", "report", "pdf");
    expect(isSubmittedFileKeyForOrder(summaryKey, "order-a")).toBe(true);

    await uploadCreateOnlyAtKey(sealedKey, {
      buffer: Buffer.from("%PDF-test"),
      mimeType: "application/pdf",
    });
    expect(storageMocks.upload).toHaveBeenCalledWith(
      sealedKey,
      expect.any(Buffer),
      expect.objectContaining({ contentType: "application/pdf", upsert: false }),
    );
  });

  it("checks artwork bytes instead of trusting the declared MIME type", () => {
    expect(artworkContentError(Buffer.from("<html>not a PDF</html>"), "application/pdf")).toBe(
      "Uploaded file content is not a PDF.",
    );
    expect(artworkContentError(Buffer.from("%PDF-1.7"), "application/pdf")).toBeNull();
    expect(
      artworkContentError(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png",
      ),
    ).toBe("Uploaded file content is not a PNG.");
    expect(
      artworkContentError(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"),
    ).toBe("Uploaded file content is not a JPEG.");
    expect(
      artworkContentError(
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
        "application/msword",
      ),
    ).toBe("Uploaded file type is not supported.");
  });

  it("requires artwork filename extensions to match their MIME type", () => {
    expect(fileNameMatchesMime("proof.pdf", "application/pdf")).toBe(true);
    expect(fileNameMatchesMime("photo.jpeg", "image/jpeg")).toBe(true);
    expect(fileNameMatchesMime("proof.html", "application/pdf")).toBe(false);
  });

  it("recursively lists every page and removes the complete order prefix in batches", async () => {
    const firstPage = [
      { name: "nested", id: null, metadata: null },
      ...Array.from({ length: 99 }, (_, index) => ({
        name: `file-${index}.pdf`,
        id: `id-${index}`,
        metadata: {},
      })),
    ];
    storageMocks.list.mockImplementation(
      async (prefix: string, options: { offset: number }) => {
        if (prefix === "order-a/nested") {
          return {
            data: [{ name: "deep.csv", id: "deep-id", metadata: {} }],
            error: null,
          };
        }
        if (options.offset === 0) return { data: firstPage, error: null };
        return {
          data: [
            { name: "file-99.pdf", id: "id-99", metadata: {} },
            { name: "file-100.pdf", id: "id-100", metadata: {} },
          ],
          error: null,
        };
      },
    );

    await removeOrderFiles("order-a");

    expect(storageMocks.list).toHaveBeenCalledWith(
      "order-a",
      expect.objectContaining({ limit: 100, offset: 0 }),
    );
    expect(storageMocks.list).toHaveBeenCalledWith(
      "order-a",
      expect.objectContaining({ limit: 100, offset: 100 }),
    );
    expect(storageMocks.list).toHaveBeenCalledWith(
      "order-a/nested",
      expect.objectContaining({ limit: 100, offset: 0 }),
    );
    expect(storageMocks.remove).toHaveBeenCalledTimes(2);
    const removed = storageMocks.remove.mock.calls.flatMap(([paths]) => paths as string[]);
    expect(removed).toHaveLength(102);
    expect(removed).toContain("order-a/nested/deep.csv");
    expect(removed.every((path) => path.startsWith("order-a/"))).toBe(true);
  });

  it("rejects unsafe order prefixes before storage access", async () => {
    await expect(removeOrderFiles("../other-order")).rejects.toThrow(
      "orderId contains unsupported characters",
    );
    expect(storageMocks.from).not.toHaveBeenCalled();
  });

  it("rejects unsafe child paths without deleting objects", async () => {
    storageMocks.list.mockResolvedValueOnce({
      data: [{ name: "../other-order", id: "bad-id", metadata: {} }],
      error: null,
    });

    await expect(removeOrderFiles("order-a")).rejects.toThrow(
      "Storage returned an invalid order file name",
    );
    expect(storageMocks.remove).not.toHaveBeenCalled();
  });
});
