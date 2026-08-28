import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findUniqueOrder: vi.fn(),
  findUniqueProfile: vi.fn(),
  getUser: vi.fn(),
  logApiError: vi.fn(),
  removeOrderFiles: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mailOrder: {
      deleteMany: mocks.deleteMany,
      findUnique: mocks.findUniqueOrder,
      updateMany: mocks.updateMany,
    },
    userProfile: { findUnique: mocks.findUniqueProfile },
  },
}));

vi.mock("@/lib/direct-mail/storage", () => ({
  removeOrderFiles: mocks.removeOrderFiles,
}));

vi.mock("@/lib/api-error", () => ({
  logApiError: mocks.logApiError,
}));

import { DELETE, PATCH } from "./route";

const draftOrder = {
  id: "order-a",
  userId: "user-a",
  status: "draft",
  campaignName: "Old name",
};

const context = { params: Promise.resolve({ id: "order-a" }) };

describe("direct-mail order mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
    mocks.findUniqueProfile.mockResolvedValue({ id: "user-a", role: "agent" });
    mocks.findUniqueOrder.mockResolvedValue(draftOrder);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.removeOrderFiles.mockResolvedValue(undefined);
  });

  it("conditionally patches only an owned draft", async () => {
    mocks.findUniqueOrder
      .mockResolvedValueOnce(draftOrder)
      .mockResolvedValueOnce({ ...draftOrder, campaignName: "New name" });

    const response = await PATCH(
      new Request("https://homewise.test/api/direct-mail/orders/order-a", {
        method: "PATCH",
        body: JSON.stringify({ campaignName: "New name" }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );

    expect(response?.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "order-a", userId: "user-a", status: "draft" },
      data: { campaignName: "New name" },
    });
  });

  it("rejects a patch when another request changed the draft status", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const response = await PATCH(
      new Request("https://homewise.test/api/direct-mail/orders/order-a", {
        method: "PATCH",
        body: JSON.stringify({ campaignName: "New name" }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );

    expect(response?.status).toBe(409);
    expect(mocks.findUniqueOrder).toHaveBeenCalledTimes(1);
  });

  it("claims a draft, removes its storage prefix, and then deletes its row", async () => {
    const response = await DELETE(
      new Request("https://homewise.test/api/direct-mail/orders/order-a", { method: "DELETE" }),
      context,
    );

    expect(response?.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-a",
        userId: "user-a",
        OR: [
          { status: "draft" },
          { status: "deleting", updatedAt: { lt: expect.any(Date) } },
        ],
      },
      data: { status: "deleting" },
    });
    expect(mocks.removeOrderFiles).toHaveBeenCalledWith("order-a");
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "order-a", userId: "user-a", status: "deleting" },
    });
    expect(mocks.removeOrderFiles.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteMany.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("recovers a stale delete claim", async () => {
    mocks.findUniqueOrder.mockResolvedValue({
      ...draftOrder,
      status: "deleting",
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    });

    const response = await DELETE(
      new Request("https://homewise.test/api/direct-mail/orders/order-a", { method: "DELETE" }),
      context,
    );

    expect(response?.status).toBe(200);
    expect(mocks.removeOrderFiles).toHaveBeenCalledWith("order-a");
    expect(mocks.deleteMany).toHaveBeenCalledOnce();
  });

  it("restores the draft status when storage cleanup fails", async () => {
    const storageError = new Error("storage unavailable");
    mocks.removeOrderFiles.mockRejectedValueOnce(storageError);

    const response = await DELETE(
      new Request("https://homewise.test/api/direct-mail/orders/order-a", { method: "DELETE" }),
      context,
    );

    expect(response?.status).toBe(502);
    expect(mocks.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "order-a", userId: "user-a", status: "deleting" },
      data: { status: "draft" },
    });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.logApiError).toHaveBeenCalledWith(
      "direct-mail/delete-order-files",
      storageError,
    );
  });
});
