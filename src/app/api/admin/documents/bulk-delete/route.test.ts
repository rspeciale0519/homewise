import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  documentCountMock,
  documentFindManyMock,
  draftCountMock,
  favoriteCountMock,
  recentCountMock,
  categoryFindUniqueMock,
  deleteManyMock,
  logCreateMock,
  logUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  documentCountMock: vi.fn(),
  documentFindManyMock: vi.fn(),
  draftCountMock: vi.fn(),
  favoriteCountMock: vi.fn(),
  recentCountMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  deleteManyMock: vi.fn(),
  logCreateMock: vi.fn(),
  logUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { count: documentCountMock, findMany: documentFindManyMock },
    documentDraft: { count: draftCountMock },
    documentFavorite: { count: favoriteCountMock },
    documentRecent: { count: recentCountMock },
    documentCategory: { findUnique: categoryFindUniqueMock },
    documentDeletionLog: { create: logCreateMock, update: logUpdateMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET, POST } from "@/app/api/admin/documents/bulk-delete/route";

function getReq(qs: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/documents/bulk-delete?${qs}`,
  );
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/documents/bulk-delete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/documents/bulk-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1", email: "a@x.com" },
      profile: { role: "admin" },
    });
    documentCountMock.mockResolvedValue(3);
    documentFindManyMock.mockResolvedValue([
      { id: "d1" },
      { id: "d2" },
      { id: "d3" },
    ]);
    draftCountMock.mockResolvedValue(2);
    favoriteCountMock.mockResolvedValue(5);
    recentCountMock.mockResolvedValue(7);
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await GET(getReq("scopeType=all"));
    expect(res.status).toBe(403);
  });

  it("returns counts for scopeType=all with crossSectionCount 0", async () => {
    const res = await GET(getReq("scopeType=all"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      documentCount: 3,
      draftCount: 2,
      favoriteCount: 5,
      recentCount: 7,
      crossSectionCount: 0,
    });
  });

  it("400 when scopeType=section without section", async () => {
    const res = await GET(getReq("scopeType=section"));
    expect(res.status).toBe(400);
  });

  it("400 when category is not in the given section", async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: "c1", section: "sales", title: "X" });
    const res = await GET(getReq("scopeType=category&section=office&categoryId=c1"));
    expect(res.status).toBe(400);
  });

  it("returns counts with crossSectionCount for scopeType=section", async () => {
    documentCountMock.mockResolvedValue(1);
    const res = await GET(getReq("scopeType=section&section=office"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      documentCount: 3,
      draftCount: 2,
      favoriteCount: 5,
      recentCount: 7,
      crossSectionCount: 1,
    });
  });

  it("400 when category is not found at all", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);
    const res = await GET(getReq("scopeType=category&section=office&categoryId=c1"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/documents/bulk-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1", email: "a@x.com" },
      profile: { role: "admin" },
    });
    documentFindManyMock.mockResolvedValue([
      { id: "d1", storageProvider: "local", storageKey: null },
      { id: "d2", storageProvider: "supabase", storageKey: "k2" },
    ]);
    documentCountMock.mockResolvedValue(0);
    draftCountMock.mockResolvedValue(1);
    favoriteCountMock.mockResolvedValue(2);
    recentCountMock.mockResolvedValue(3);
    logCreateMock.mockResolvedValue({ id: "log-1" });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentDraft: { count: draftCountMock },
          documentFavorite: { count: favoriteCountMock },
          documentRecent: { count: recentCountMock },
          document: { deleteMany: deleteManyMock },
          documentDeletionLog: { create: logCreateMock },
        });
      }
      return undefined;
    });
    deleteManyMock.mockResolvedValue({ count: 2 });
  });

  it("400 on wrong confirmation phrase", async () => {
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 2, confirmationPhrase: "DELETE" }),
    );
    expect(res.status).toBe(400);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("409 and a blocked log row when actual exceeds expected", async () => {
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 1, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(409);
    expect(logCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outcome: "blocked_scope_changed",
          documentCount: 0,
          expectedDocumentCount: 1,
          actualDocumentCount: 2,
        }),
      }),
    );
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("deletes, writes an executed log row, and returns counts", async () => {
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 2, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["d1", "d2"] } },
    });
    expect(logCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outcome: "executed", documentCount: 2 }),
      }),
    );
    expect(await res.json()).toEqual(
      expect.objectContaining({ success: true, documentCount: 2 }),
    );
  });

  it("no-op (zero matched) still writes an executed log row with zeros", async () => {
    documentFindManyMock.mockResolvedValue([]);
    deleteManyMock.mockResolvedValue({ count: 0 });
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 0, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(200);
    expect(logCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outcome: "executed", documentCount: 0 }),
      }),
    );
  });
});
