import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  membershipFindManyMock,
  membershipDeleteManyMock,
  membershipUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  membershipDeleteManyMock: vi.fn(),
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
      findMany: membershipFindManyMock,
      deleteMany: membershipDeleteManyMock,
      update: membershipUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { POST } from "@/app/api/admin/documents/memberships/bulk-unassign/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/memberships/bulk-unassign",
    { method: "POST", body: JSON.stringify(body) },
  );
}

describe("POST /api/admin/documents/memberships/bulk-unassign", () => {
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
            findMany: membershipFindManyMock,
            deleteMany: membershipDeleteManyMock,
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
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1"] }),
    );
    expect(res.status).toBe(403);
    expect(membershipDeleteManyMock).not.toHaveBeenCalled();
  });

  it("400 on empty documentIds", async () => {
    const res = await POST(postReq({ categoryId: "cat1", documentIds: [] }));
    expect(res.status).toBe(400);
  });

  it("400 on duplicate documentIds", async () => {
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1", "d1"] }),
    );
    expect(res.status).toBe(400);
  });

  it("removes existing memberships and dense-reindexes remaining", async () => {
    membershipFindManyMock
      .mockResolvedValueOnce([{ documentId: "d1" }, { documentId: "d2" }])
      .mockResolvedValueOnce([
        { documentId: "d3", categoryId: "cat1", sortOrder: 2 },
        { documentId: "d4", categoryId: "cat1", sortOrder: 5 },
      ]);

    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1", "d2"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toEqual(["d1", "d2"]);
    expect(body.failed).toEqual([]);

    expect(membershipDeleteManyMock).toHaveBeenCalledWith({
      where: { categoryId: "cat1", documentId: { in: ["d1", "d2"] } },
    });
    expect(membershipUpdateMock).toHaveBeenNthCalledWith(1, {
      where: {
        documentId_categoryId: { documentId: "d3", categoryId: "cat1" },
      },
      data: { sortOrder: 0 },
    });
    expect(membershipUpdateMock).toHaveBeenNthCalledWith(2, {
      where: {
        documentId_categoryId: { documentId: "d4", categoryId: "cat1" },
      },
      data: { sortOrder: 1 },
    });
  });

  it("reports missing memberships as failed with NOT_MEMBER", async () => {
    membershipFindManyMock
      .mockResolvedValueOnce([{ documentId: "d1" }])
      .mockResolvedValueOnce([]);

    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1", "dGone"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toEqual(["d1"]);
    expect(body.failed).toEqual([
      { documentId: "dGone", error: "NOT_MEMBER" },
    ]);
  });

  it("skips delete and reindex when no removals match", async () => {
    membershipFindManyMock.mockResolvedValueOnce([]);

    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["dGone"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toEqual([]);
    expect(body.failed).toEqual([
      { documentId: "dGone", error: "NOT_MEMBER" },
    ]);
    expect(membershipDeleteManyMock).not.toHaveBeenCalled();
    expect(membershipUpdateMock).not.toHaveBeenCalled();
  });
});
