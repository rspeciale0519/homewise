import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  contentFindManyMock,
  contentUpdateMock,
  categoryFindUniqueMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  contentFindManyMock: vi.fn(),
  contentUpdateMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingContent: {
      findMany: contentFindManyMock,
      update: contentUpdateMock,
    },
    trainingCategory: { findUnique: categoryFindUniqueMock },
  },
}));

import { POST } from "./route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/bulk-category", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const adminAuth = {
  user: { id: "admin-1", email: "a@x.com" },
  profile: { role: "admin" },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
});

describe("POST /api/admin/training/bulk-category", () => {
  it("returns 403 when caller is not admin", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response("forbidden", { status: 403 }),
    });
    const res = await POST(
      postReq({ contentIds: ["c1"], toCategoryId: "cat-x" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when target category does not exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);
    const res = await POST(
      postReq({ contentIds: ["c1"], toCategoryId: "cat-ghost" }),
    );
    expect(res.status).toBe(404);
  });

  it("accepts toCategoryId: null (un-categorize)", async () => {
    contentFindManyMock.mockResolvedValue([{ id: "c1" }]);
    contentUpdateMock.mockResolvedValue({});
    const res = await POST(
      postReq({ contentIds: ["c1"], toCategoryId: null }),
    );
    expect(res.status).toBe(200);
    expect(categoryFindUniqueMock).not.toHaveBeenCalled();
    expect(contentUpdateMock).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { categoryId: null },
    });
  });

  it("updates categoryId on each existing content row", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: "cat-disclosure",
      name: "Disclosures",
    });
    contentFindManyMock.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    contentUpdateMock.mockResolvedValue({});
    const res = await POST(
      postReq({
        contentIds: ["c1", "c2"],
        toCategoryId: "cat-disclosure",
      }),
    );
    const body = await res.json();
    expect(body.updated).toEqual([
      { contentId: "c1", categoryId: "cat-disclosure" },
      { contentId: "c2", categoryId: "cat-disclosure" },
    ]);
    expect(contentUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("reports unknown content ids as failed", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: "cat-x",
      name: "X",
    });
    contentFindManyMock.mockResolvedValue([{ id: "c1" }]);
    contentUpdateMock.mockResolvedValue({});
    const res = await POST(
      postReq({
        contentIds: ["c1", "missing"],
        toCategoryId: "cat-x",
      }),
    );
    const body = await res.json();
    expect(body.updated).toEqual([
      { contentId: "c1", categoryId: "cat-x" },
    ]);
    expect(body.failed).toEqual([
      { contentId: "missing", error: "not-found" },
    ]);
  });
});
