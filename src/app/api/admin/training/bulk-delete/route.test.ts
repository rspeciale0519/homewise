import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  findManyMock,
  deleteMock,
  storageRemoveMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  findManyMock: vi.fn(),
  deleteMock: vi.fn(),
  storageRemoveMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingContent: { findMany: findManyMock, delete: deleteMock },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ remove: storageRemoveMock }) },
  }),
}));

import { POST } from "./route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/bulk-delete", {
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
  storageRemoveMock.mockResolvedValue({ data: null, error: null });
});

describe("POST /api/admin/training/bulk-delete", () => {
  it("returns 403 when caller is not admin", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response("forbidden", { status: 403 }),
    });
    const res = await POST(postReq({ contentIds: ["c1"] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on empty contentIds", async () => {
    const res = await POST(postReq({ contentIds: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on duplicate contentIds", async () => {
    const res = await POST(postReq({ contentIds: ["c1", "c1"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when over the 100-item cap", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `c${i}`);
    const res = await POST(postReq({ contentIds: ids }));
    expect(res.status).toBe(400);
  });

  it("deletes existing rows and reports missing ones as failed", async () => {
    findManyMock.mockResolvedValue([
      { id: "c1", fileKey: "training/c1.pdf" },
      { id: "c2", fileKey: null },
    ]);
    deleteMock.mockResolvedValue({});
    const res = await POST(postReq({ contentIds: ["c1", "c2", "c-missing"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toEqual([{ contentId: "c1" }, { contentId: "c2" }]);
    expect(body.failed).toEqual([
      { contentId: "c-missing", error: "not-found" },
    ]);
  });

  it("removes Supabase storage files only for rows with a fileKey", async () => {
    findManyMock.mockResolvedValue([
      { id: "c1", fileKey: "training/c1.pdf" },
      { id: "c2", fileKey: null },
      { id: "c3", fileKey: "training/c3.mp4" },
    ]);
    deleteMock.mockResolvedValue({});
    await POST(postReq({ contentIds: ["c1", "c2", "c3"] }));
    expect(storageRemoveMock).toHaveBeenCalledWith([
      "training/c1.pdf",
      "training/c3.mp4",
    ]);
  });

  it("surfaces a DB error per row without aborting the batch", async () => {
    findManyMock.mockResolvedValue([
      { id: "c1", fileKey: null },
      { id: "c2", fileKey: null },
    ]);
    deleteMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("FK violation"));
    const res = await POST(postReq({ contentIds: ["c1", "c2"] }));
    const body = await res.json();
    expect(body.deleted).toEqual([{ contentId: "c1" }]);
    expect(body.failed).toEqual([
      { contentId: "c2", error: "FK violation" },
    ]);
  });

  it("does not call storage.remove when no fileKeys collected", async () => {
    findManyMock.mockResolvedValue([{ id: "c1", fileKey: null }]);
    deleteMock.mockResolvedValue({});
    await POST(postReq({ contentIds: ["c1"] }));
    expect(storageRemoveMock).not.toHaveBeenCalled();
  });
});
