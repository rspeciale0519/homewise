import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  membershipFindManyMock,
  transactionMock,
  membershipUpdateMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  membershipUpdateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategoryMembership: {
      findMany: membershipFindManyMock,
      update: membershipUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { PATCH } from "@/app/api/admin/documents/memberships/reorder/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/memberships/reorder",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

describe("PATCH /api/admin/documents/memberships/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentCategoryMembership: { update: membershipUpdateMock },
        });
      }
      return undefined;
    });
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await PATCH(
      makeRequest({ categoryId: "c", documentIds: [] }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when submitted docs do not match current members", async () => {
    membershipFindManyMock.mockResolvedValue([
      { documentId: "d1", categoryId: "c" },
      { documentId: "d2", categoryId: "c" },
    ]);
    const res = await PATCH(
      makeRequest({ categoryId: "c", documentIds: ["d1"] }),
    );
    expect(res.status).toBe(400);
  });

  it("updates membership sortOrder on success", async () => {
    membershipFindManyMock.mockResolvedValue([
      { documentId: "d1", categoryId: "c" },
      { documentId: "d2", categoryId: "c" },
      { documentId: "d3", categoryId: "c" },
    ]);
    const res = await PATCH(
      makeRequest({ categoryId: "c", documentIds: ["d3", "d1", "d2"] }),
    );
    expect(res.status).toBe(200);
    expect(membershipUpdateMock).toHaveBeenCalledTimes(3);
    expect(membershipUpdateMock).toHaveBeenNthCalledWith(1, {
      where: { documentId_categoryId: { documentId: "d3", categoryId: "c" } },
      data: { sortOrder: 0 },
    });
  });
});
