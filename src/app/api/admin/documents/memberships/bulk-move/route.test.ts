import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  categoryFindUniqueMock,
  membershipCountMock,
  membershipFindUniqueMock,
  membershipFindManyMock,
  membershipDeleteMock,
  membershipCreateMock,
  membershipUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  membershipCountMock: vi.fn(),
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
    documentCategory: { findUnique: categoryFindUniqueMock },
    documentCategoryMembership: {
      count: membershipCountMock,
      findUnique: membershipFindUniqueMock,
      findMany: membershipFindManyMock,
      delete: membershipDeleteMock,
      create: membershipCreateMock,
      update: membershipUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/admin/documents/memberships/bulk-move/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/memberships/bulk-move",
    { method: "POST", body: JSON.stringify(body) },
  );
}

const sourceMembership = (documentId: string, categoryId: string) => ({
  documentId,
  categoryId,
  sortOrder: 0,
});

describe("POST /api/admin/documents/memberships/bulk-move", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    categoryFindUniqueMock.mockResolvedValue({ id: "targetCat" });
    membershipCountMock.mockResolvedValue(0);
    membershipFindUniqueMock.mockResolvedValue(null);
    membershipFindManyMock.mockResolvedValue([]);
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentCategoryMembership: {
            delete: membershipDeleteMock,
            create: membershipCreateMock,
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
    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [{ documentId: "d1", fromCategoryId: "srcCat" }],
      }),
    );
    expect(res.status).toBe(403);
    expect(membershipDeleteMock).not.toHaveBeenCalled();
  });

  it("400 on empty moves", async () => {
    const res = await POST(postReq({ toCategoryId: "targetCat", moves: [] }));
    expect(res.status).toBe(400);
  });

  it("400 on more than 50 moves", async () => {
    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: Array.from({ length: 51 }, (_, i) => ({
          documentId: `d${i}`,
          fromCategoryId: "srcCat",
        })),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 on duplicate documentIds in moves", async () => {
    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [
          { documentId: "d1", fromCategoryId: "srcA" },
          { documentId: "d1", fromCategoryId: "srcB" },
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("404 when toCategoryId is non-null and category does not exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);
    const res = await POST(
      postReq({
        toCategoryId: "ghost",
        moves: [{ documentId: "d1", fromCategoryId: "srcCat" }],
      }),
    );
    expect(res.status).toBe(404);
  });

  it("accepts toCategoryId: null (drag-to-Uncategorized) without category validation", async () => {
    membershipFindUniqueMock.mockResolvedValue(sourceMembership("d1", "srcCat"));
    const res = await POST(
      postReq({
        toCategoryId: null,
        moves: [{ documentId: "d1", fromCategoryId: "srcCat" }],
      }),
    );
    expect(res.status).toBe(200);
    expect(categoryFindUniqueMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.toCategoryId).toBeNull();
    expect(body.moved).toEqual([{ documentId: "d1", sortOrder: null }]);
  });

  it("moves docs: deletes source + creates target with dense tail sortOrder", async () => {
    membershipCountMock.mockResolvedValue(5);
    membershipFindUniqueMock
      .mockResolvedValueOnce(sourceMembership("d1", "srcCat"))
      .mockResolvedValueOnce(null) // target check for d1
      .mockResolvedValueOnce(sourceMembership("d2", "srcCat"))
      .mockResolvedValueOnce(null); // target check for d2

    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [
          { documentId: "d1", fromCategoryId: "srcCat" },
          { documentId: "d2", fromCategoryId: "srcCat" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.moved).toEqual([
      { documentId: "d1", sortOrder: 5 },
      { documentId: "d2", sortOrder: 6 },
    ]);
    expect(body.skipped).toEqual([]);
    expect(body.failed).toEqual([]);
  });

  it("reports docs not in source as skipped with not-in-source reason", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce(null) // d1 source missing
      .mockResolvedValueOnce(sourceMembership("d2", "srcCat"))
      .mockResolvedValueOnce(null); // d2 target

    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [
          { documentId: "d1", fromCategoryId: "srcCat" },
          { documentId: "d2", fromCategoryId: "srcCat" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toEqual([
      { documentId: "d1", reason: "not-in-source" },
    ]);
    expect(body.moved).toEqual([{ documentId: "d2", sortOrder: 0 }]);
  });

  it("reports doc already in target as skipped already-member but still deletes source", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce(sourceMembership("d1", "srcCat"))
      .mockResolvedValueOnce(sourceMembership("d1", "targetCat")); // target already has d1

    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [{ documentId: "d1", fromCategoryId: "srcCat" }],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toEqual([
      { documentId: "d1", reason: "already-member" },
    ]);
    expect(membershipDeleteMock).toHaveBeenCalledWith({
      where: {
        documentId_categoryId: { documentId: "d1", categoryId: "srcCat" },
      },
    });
  });

  it("treats P2003 FK violation as failed with document-not-found", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce(sourceMembership("dGone", "srcCat"))
      .mockResolvedValueOnce(null);
    transactionMock.mockImplementationOnce(async () => {
      const err: Error & { code?: string } = new Error("FK violation");
      err.code = "P2003";
      throw err;
    });

    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [{ documentId: "dGone", fromCategoryId: "srcCat" }],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toEqual([
      { documentId: "dGone", error: "document-not-found" },
    ]);
  });

  it("continues after a per-item failure (partial success)", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce(sourceMembership("dGone", "srcCat"))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(sourceMembership("dOk", "srcCat"))
      .mockResolvedValueOnce(null);
    transactionMock
      .mockImplementationOnce(async () => {
        const err: Error & { code?: string } = new Error("FK violation");
        err.code = "P2003";
        throw err;
      })
      .mockImplementationOnce(async (cb) => {
        if (typeof cb === "function") {
          await cb({
            documentCategoryMembership: {
              delete: membershipDeleteMock,
              create: membershipCreateMock,
            },
          });
        }
      });

    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [
          { documentId: "dGone", fromCategoryId: "srcCat" },
          { documentId: "dOk", fromCategoryId: "srcCat" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toEqual([
      { documentId: "dGone", error: "document-not-found" },
    ]);
    expect(body.moved).toEqual([{ documentId: "dOk", sortOrder: 0 }]);
  });

  it("handles moves from multiple source categories within one request", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce(sourceMembership("d1", "srcA"))
      .mockResolvedValueOnce(null) // target for d1
      .mockResolvedValueOnce(sourceMembership("d2", "srcB"))
      .mockResolvedValueOnce(null); // target for d2

    const res = await POST(
      postReq({
        toCategoryId: "targetCat",
        moves: [
          { documentId: "d1", fromCategoryId: "srcA" },
          { documentId: "d2", fromCategoryId: "srcB" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.moved.map((m: { documentId: string }) => m.documentId)).toEqual(
      ["d1", "d2"],
    );
  });
});
