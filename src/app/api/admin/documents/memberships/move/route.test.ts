import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  membershipFindUniqueMock,
  membershipFindManyMock,
  membershipDeleteMock,
  membershipCreateMock,
  membershipUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  membershipDeleteMock: vi.fn(),
  membershipCreateMock: vi.fn(),
  membershipUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategoryMembership: {
      findUnique: membershipFindUniqueMock,
      findMany: membershipFindManyMock,
      delete: membershipDeleteMock,
      create: membershipCreateMock,
      update: membershipUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { PATCH } from "@/app/api/admin/documents/memberships/move/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/memberships/move",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

describe("PATCH /api/admin/documents/memberships/move", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentCategoryMembership: {
            findUnique: membershipFindUniqueMock,
            findMany: membershipFindManyMock,
            delete: membershipDeleteMock,
            create: membershipCreateMock,
            update: membershipUpdateMock,
          },
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
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 when document is not a member of fromCategory", async () => {
    membershipFindUniqueMock.mockResolvedValueOnce(null);
    membershipFindManyMock.mockResolvedValue([]);
    const res = await PATCH(
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(409);
  });

  it("merges when document is already in toCategory (deletes from, no create)", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce({ documentId: "d1", categoryId: "a" })
      .mockResolvedValueOnce({ documentId: "d1", categoryId: "b" });
    membershipFindManyMock
      .mockResolvedValueOnce([
        { documentId: "d1", categoryId: "b", sortOrder: 2 },
      ])
      .mockResolvedValueOnce([
        { documentId: "d1", categoryId: "b", sortOrder: 2 },
      ]);

    const res = await PATCH(
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(200);
    expect(membershipDeleteMock).toHaveBeenCalledWith({
      where: {
        documentId_categoryId: { documentId: "d1", categoryId: "a" },
      },
    });
    expect(membershipCreateMock).not.toHaveBeenCalled();
  });

  it("moves (delete from + create to) when doc is not yet in toCategory", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce({ documentId: "d1", categoryId: "a" })
      .mockResolvedValueOnce(null);
    membershipFindManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { documentId: "d1", categoryId: "b", sortOrder: 0 },
      ]);

    const res = await PATCH(
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(200);
    expect(membershipDeleteMock).toHaveBeenCalledWith({
      where: {
        documentId_categoryId: { documentId: "d1", categoryId: "a" },
      },
    });
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: {
        documentId: "d1",
        categoryId: "b",
        sortOrder: 0,
      },
    });
  });
});
