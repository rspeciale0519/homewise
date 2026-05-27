import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiMock, findManyMock, findUniqueMock, createMock } =
  vi.hoisted(() => ({
    requireAdminApiMock: vi.fn(),
    findManyMock: vi.fn(),
    findUniqueMock: vi.fn(),
    createMock: vi.fn(),
  }));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingCategory: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
    },
  },
}));

import { GET, POST } from "./route";

const adminAuth = {
  user: { id: "admin-1", email: "a@x.com" },
  profile: { role: "admin" },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
});

describe("GET /api/admin/training/categories", () => {
  it("returns 403 when caller is not admin", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response("forbidden", { status: 403 }),
    });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns categories sorted by sortOrder then name with content counts", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat-a", name: "Alpha", _count: { content: 2 } },
      { id: "cat-b", name: "Beta", _count: { content: 0 } },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { content: true } } },
    });
  });
});

describe("POST /api/admin/training/categories", () => {
  function postReq(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/admin/training/categories", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns 400 on missing name", async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 409 when slug already exists", async () => {
    findUniqueMock.mockResolvedValue({ id: "cat-x", slug: "buyer-prep" });
    const res = await POST(postReq({ name: "Buyer Prep" }));
    expect(res.status).toBe(409);
  });

  it("creates category with derived slug + deterministic id", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockImplementation(async ({ data }) => ({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const res = await POST(
      postReq({ name: "Closing Process", description: "x" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("cat-closing-process");
    expect(body.slug).toBe("closing-process");
    expect(body.name).toBe("Closing Process");
  });
});
