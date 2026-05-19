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
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  documentCountMock: vi.fn(),
  documentFindManyMock: vi.fn(),
  draftCountMock: vi.fn(),
  favoriteCountMock: vi.fn(),
  recentCountMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
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
  },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/admin/documents/bulk-delete/route";

function getReq(qs: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/documents/bulk-delete?${qs}`,
  );
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
