import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiMock, findManyMock, updateMock } = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingContent: { findMany: findManyMock, update: updateMock },
  },
}));

import { POST } from "./route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/bulk-status", {
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

describe("POST /api/admin/training/bulk-status", () => {
  it("returns 403 when caller is not admin", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response("forbidden", { status: 403 }),
    });
    const res = await POST(postReq({ contentIds: ["c1"], status: "draft" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid status value", async () => {
    const res = await POST(
      postReq({ contentIds: ["c1"], status: "obsolete" }),
    );
    expect(res.status).toBe(400);
  });

  it("updates status + keeps legacy `published` boolean in sync (true)", async () => {
    findManyMock.mockResolvedValue([
      { id: "c1", publishedAt: null },
      { id: "c2", publishedAt: null },
    ]);
    updateMock.mockResolvedValue({});
    const res = await POST(
      postReq({ contentIds: ["c1", "c2"], status: "published" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toHaveLength(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
    const firstCall = updateMock.mock.calls[0]![0];
    expect(firstCall.data.status).toBe("published");
    expect(firstCall.data.published).toBe(true);
    expect(firstCall.data.publishedAt).toBeInstanceOf(Date);
  });

  it("keeps existing publishedAt when status stays published", async () => {
    const existingDate = new Date("2026-01-15T00:00:00Z");
    findManyMock.mockResolvedValue([{ id: "c1", publishedAt: existingDate }]);
    updateMock.mockResolvedValue({});
    await POST(postReq({ contentIds: ["c1"], status: "published" }));
    const call = updateMock.mock.calls[0]![0];
    expect(call.data.publishedAt).toBe(existingDate);
  });

  it("sets published=false when status flips to archived/draft", async () => {
    findManyMock.mockResolvedValue([{ id: "c1", publishedAt: new Date() }]);
    updateMock.mockResolvedValue({});
    await POST(postReq({ contentIds: ["c1"], status: "archived" }));
    const call = updateMock.mock.calls[0]![0];
    expect(call.data.published).toBe(false);
  });

  it("reports unknown ids as failed", async () => {
    findManyMock.mockResolvedValue([{ id: "c1", publishedAt: null }]);
    updateMock.mockResolvedValue({});
    const res = await POST(
      postReq({ contentIds: ["c1", "ghost"], status: "draft" }),
    );
    const body = await res.json();
    expect(body.updated).toEqual([{ contentId: "c1", status: "draft" }]);
    expect(body.failed).toEqual([
      { contentId: "ghost", error: "not-found" },
    ]);
  });
});
