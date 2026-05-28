import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiMock, findUniqueMock, updateMock, deleteMock } =
  vi.hoisted(() => ({
    requireAdminApiMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
  }));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingContent: {
      findUnique: findUniqueMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ remove: vi.fn() }) },
  }),
}));

vi.mock("@/lib/slug/slugify", () => ({
  slugValidationError: () => null,
}));

vi.mock("@/lib/slug/resolve", () => ({
  isSlugTakenForTraining: vi.fn(),
  recordTrainingSlugChange: vi.fn(),
}));

import { PATCH, DELETE } from "./route";

const forbidden = { error: new Response("forbidden", { status: 403 }) };
const adminAuth = { user: { id: "admin-1" }, profile: { role: "admin" } };

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/c1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function deleteReq(): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/c1", {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
});

describe("PATCH /api/admin/training/[id]", () => {
  it("returns 403 for a non-admin caller and does not mutate", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const res = await PATCH(patchReq({ title: "x" }), ctx("c1"));
    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates content for an admin", async () => {
    findUniqueMock.mockResolvedValue({
      id: "c1",
      slug: "s",
      status: "draft",
      publishedAt: null,
    });
    updateMock.mockResolvedValue({ id: "c1", title: "x" });
    const res = await PATCH(patchReq({ title: "x" }), ctx("c1"));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/training/[id]", () => {
  it("returns 403 for a non-admin caller and does not delete", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const res = await DELETE(deleteReq(), ctx("c1"));
    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes content for an admin", async () => {
    findUniqueMock.mockResolvedValue({ id: "c1", fileKey: null });
    deleteMock.mockResolvedValue({});
    const res = await DELETE(deleteReq(), ctx("c1"));
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "c1" } });
  });
});
