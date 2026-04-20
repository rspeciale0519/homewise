import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  categoryFindManyMock,
  transactionMock,
  categoryUpdateMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  categoryUpdateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategory: {
      findMany: categoryFindManyMock,
      update: categoryUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { PATCH } from "@/app/api/admin/documents/categories/reorder/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/categories/reorder",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

describe("PATCH /api/admin/documents/categories/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({ documentCategory: { update: categoryUpdateMock } });
      }
      return undefined;
    });
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await PATCH(makeRequest({ section: "office", categoryIds: [] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when submitted ids don't match the section's current set", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
      { id: "b", section: "office" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["a"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when an id belongs to a different section", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["b"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on duplicate ids", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
      { id: "b", section: "office" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["a", "a"] }),
    );
    expect(res.status).toBe(400);
  });

  it("updates sortOrder in a transaction on success", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
      { id: "b", section: "office" },
      { id: "c", section: "office" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["c", "a", "b"] }),
    );
    expect(res.status).toBe(200);
    expect(categoryUpdateMock).toHaveBeenCalledTimes(3);
    expect(categoryUpdateMock).toHaveBeenNthCalledWith(1, {
      where: { id: "c" },
      data: { sortOrder: 0 },
    });
    expect(categoryUpdateMock).toHaveBeenNthCalledWith(2, {
      where: { id: "a" },
      data: { sortOrder: 1 },
    });
    expect(categoryUpdateMock).toHaveBeenNthCalledWith(3, {
      where: { id: "b" },
      data: { sortOrder: 2 },
    });
  });
});
