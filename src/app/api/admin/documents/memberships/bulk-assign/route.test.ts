import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  categoryFindUniqueMock,
  membershipCountMock,
  membershipFindUniqueMock,
  membershipCreateMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  membershipCountMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  membershipCreateMock: vi.fn(),
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
      create: membershipCreateMock,
    },
  },
}));

import { POST } from "@/app/api/admin/documents/memberships/bulk-assign/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/memberships/bulk-assign",
    { method: "POST", body: JSON.stringify(body) },
  );
}

describe("POST /api/admin/documents/memberships/bulk-assign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    categoryFindUniqueMock.mockResolvedValue({ id: "cat1" });
    membershipCountMock.mockResolvedValue(0);
    membershipFindUniqueMock.mockResolvedValue(null);
    membershipCreateMock.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ ...data }),
    );
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1"] }),
    );
    expect(res.status).toBe(403);
    expect(membershipCreateMock).not.toHaveBeenCalled();
  });

  it("400 on empty documentIds", async () => {
    const res = await POST(postReq({ categoryId: "cat1", documentIds: [] }));
    expect(res.status).toBe(400);
  });

  it("400 on more than 50 documentIds", async () => {
    const res = await POST(
      postReq({
        categoryId: "cat1",
        documentIds: Array.from({ length: 51 }, (_, i) => `d${i}`),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 on duplicate documentIds", async () => {
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1", "d1"] }),
    );
    expect(res.status).toBe(400);
  });

  it("404 when category does not exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);
    const res = await POST(
      postReq({ categoryId: "missing", documentIds: ["d1"] }),
    );
    expect(res.status).toBe(404);
  });

  it("assigns docs with dense sortOrder starting from existing count", async () => {
    membershipCountMock.mockResolvedValue(3);
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1", "d2", "d3"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assigned).toEqual([
      { documentId: "d1", sortOrder: 3 },
      { documentId: "d2", sortOrder: 4 },
      { documentId: "d3", sortOrder: 5 },
    ]);
    expect(body.skipped).toEqual([]);
    expect(body.failed).toEqual([]);
    expect(membershipCreateMock).toHaveBeenCalledTimes(3);
  });

  it("treats existing membership (findUnique returns row) as skipped, not failed", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce({
        documentId: "d1",
        categoryId: "cat1",
        sortOrder: 0,
      })
      .mockResolvedValueOnce(null);
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1", "d2"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toEqual([
      { documentId: "d1", reason: "already-member" },
    ]);
    expect(body.assigned).toEqual([{ documentId: "d2", sortOrder: 0 }]);
    expect(body.failed).toEqual([]);
  });

  it("treats P2002 unique violation as skipped (race condition)", async () => {
    membershipCreateMock.mockImplementationOnce(async () => {
      const err: Error & { code?: string } = new Error("Unique constraint");
      err.code = "P2002";
      throw err;
    });
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["d1"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toEqual([
      { documentId: "d1", reason: "already-member" },
    ]);
    expect(body.failed).toEqual([]);
  });

  it("treats P2003 FK violation as failed with document-not-found", async () => {
    membershipCreateMock.mockImplementationOnce(async () => {
      const err: Error & { code?: string } = new Error("FK violation");
      err.code = "P2003";
      throw err;
    });
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["dGone"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toEqual([
      { documentId: "dGone", error: "document-not-found" },
    ]);
    expect(body.assigned).toEqual([]);
  });

  it("continues after a per-item failure (partial success)", async () => {
    membershipCreateMock
      .mockImplementationOnce(async () => {
        const err: Error & { code?: string } = new Error("FK violation");
        err.code = "P2003";
        throw err;
      })
      .mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
      }));
    const res = await POST(
      postReq({ categoryId: "cat1", documentIds: ["dGone", "dOk"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assigned).toEqual([{ documentId: "dOk", sortOrder: 0 }]);
    expect(body.failed).toEqual([
      { documentId: "dGone", error: "document-not-found" },
    ]);
  });
});
