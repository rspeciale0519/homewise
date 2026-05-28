import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiMock, transactionMock, deleteMock } = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  transactionMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingCourse: { delete: deleteMock },
    $transaction: transactionMock,
  },
}));

import { PATCH, DELETE } from "./route";

const forbidden = { error: new Response("forbidden", { status: 403 }) };
const adminAuth = { user: { id: "admin-1" }, profile: { role: "admin" } };

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
});

describe("PATCH /api/admin/training/tracks/[id]", () => {
  it("returns 403 for a non-admin caller and does not touch the course", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const req = new NextRequest(
      "http://localhost/api/admin/training/tracks/c1",
      { method: "PATCH", body: JSON.stringify({ name: "x" }) },
    );
    const res = await PATCH(req, ctx("c1"));
    expect(res.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/training/tracks/[id]", () => {
  it("returns 403 for a non-admin caller and does not delete", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const req = new NextRequest(
      "http://localhost/api/admin/training/tracks/c1",
      { method: "DELETE" },
    );
    const res = await DELETE(req, ctx("c1"));
    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the course for an admin", async () => {
    deleteMock.mockResolvedValue({});
    const req = new NextRequest(
      "http://localhost/api/admin/training/tracks/c1",
      { method: "DELETE" },
    );
    const res = await DELETE(req, ctx("c1"));
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "c1" } });
  });
});
