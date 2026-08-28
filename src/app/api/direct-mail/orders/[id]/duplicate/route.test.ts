import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  deleteMany: vi.fn(),
  download: vi.fn(),
  findOrder: vi.fn(),
  findProfile: vi.fn(),
  getUser: vi.fn(),
  isSubmittedKey: vi.fn(),
  logApiError: vi.fn(),
  removeOrderFiles: vi.fn(),
  updateOrder: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mailOrder: {
      create: mocks.createOrder,
      deleteMany: mocks.deleteMany,
      findUnique: mocks.findOrder,
      update: mocks.updateOrder,
    },
    userProfile: { findUnique: mocks.findProfile },
  },
}));

vi.mock("@/lib/direct-mail/storage", () => ({
  artworkUploadAttemptKeyFor: (
    orderId: string,
    fileId: string,
    byteSize: number,
    ext: string,
  ) => `${orderId}/upload-artwork-${fileId}-${byteSize}.${ext}`,
  downloadObjectWithinLimit: mocks.download,
  extFromMime: (mime: string) => mime === "application/pdf" ? "pdf" : "bin",
  isSubmittedFileKeyForOrder: mocks.isSubmittedKey,
  listUploadAttemptKeyFor: (orderId: string, fileId: string, byteSize: number) =>
    `${orderId}/upload-list-${fileId}-${byteSize}.csv`,
  removeOrderFiles: mocks.removeOrderFiles,
  uploadCreateOnlyAtKey: mocks.upload,
}));

vi.mock("@/lib/api-error", () => ({ logApiError: mocks.logApiError }));
vi.mock("nanoid", () => ({ nanoid: vi.fn(() => "new-file-id") }));

import { POST } from "./route";

const sourceOrder = {
  id: "source-order",
  userId: "user-a",
  status: "submitted",
  purgedAt: null,
  workflow: "new_farming",
  subjectPropertyAddress: null,
  campaignName: "Campaign",
  productType: "postcard",
  productSize: "6x9",
  mailClass: "first_class",
  returnAddress: {
    name: "Agent",
    address1: "1 Main St",
    city: "Orlando",
    state: "FL",
    zip: "32801",
  },
  quantity: 2,
  specialInstructions: null,
  artworkFiles: [{
    id: "art-1",
    name: "Front",
    fileKey: "source-order/submitted-key-artwork-art-1.pdf",
    fileName: "front.pdf",
    byteSize: 20,
    mimeType: "application/pdf",
    warnings: [],
  }],
  listFiles: [{
    id: "list-1",
    name: "Recipients",
    fileKey: "source-order/submitted-key-list-list-1.csv",
    fileName: "recipients.csv",
    byteSize: 30,
    rowCount: 2,
    columns: ["name"],
    fillPercent: { name: 100 },
    excludedColumns: [],
    warnings: [],
  }],
};

const context = { params: Promise.resolve({ id: "source-order" }) };

function request(body: unknown): Request {
  return new Request("https://homewise.test/api/direct-mail/orders/source-order/duplicate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/direct-mail/orders/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
    mocks.findProfile.mockResolvedValue({ id: "user-a", role: "agent" });
    mocks.findOrder.mockResolvedValue(sourceOrder);
    mocks.createOrder.mockResolvedValue({ id: "draft-order" });
    mocks.download.mockImplementation(async (key: string) => ({
      buffer: Buffer.from(key),
      byteSize: key.includes("artwork") ? 20 : 30,
      mimeType: key.endsWith(".pdf") ? "application/pdf" : "text/csv",
    }));
    mocks.isSubmittedKey.mockReturnValue(true);
    mocks.upload.mockResolvedValue(undefined);
    mocks.updateOrder.mockResolvedValue({});
    mocks.removeOrderFiles.mockResolvedValue(undefined);
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("duplicates only bounded files under the submitted order prefix", async () => {
    const response = await POST(request({ includeList: true }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ orderId: "draft-order" });
    expect(mocks.download).toHaveBeenCalledTimes(2);
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.updateOrder).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "draft-order" },
    }));
  });

  it("rejects drafts and purged source orders", async () => {
    mocks.findOrder.mockResolvedValueOnce({ ...sourceOrder, status: "draft" });

    const response = await POST(request({ includeList: false }), context);

    expect(response.status).toBe(409);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("removes a partial draft when a source key is outside the order prefix", async () => {
    mocks.isSubmittedKey.mockReturnValueOnce(false);

    const response = await POST(request({ includeList: false }), context);

    expect(response.status).toBe(502);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.removeOrderFiles).toHaveBeenCalledWith("draft-order");
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "draft-order", userId: "user-a", status: "draft" },
    });
  });
});
