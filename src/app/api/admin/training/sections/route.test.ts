import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  courseFindUniqueMock,
  sectionFindFirstMock,
  sectionCreateMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  courseFindUniqueMock: vi.fn(),
  sectionFindFirstMock: vi.fn(),
  sectionCreateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingCourse: { findUnique: courseFindUniqueMock },
    trainingSection: {
      findFirst: sectionFindFirstMock,
      create: sectionCreateMock,
    },
  },
}));

import { POST } from "./route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/sections", {
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

describe("POST /api/admin/training/sections", () => {
  it("returns 403 when caller is not admin", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response("forbidden", { status: 403 }),
    });
    const res = await POST(
      postReq({ courseId: "c1", title: "Intro" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 on missing title", async () => {
    const res = await POST(postReq({ courseId: "c1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when course does not exist", async () => {
    courseFindUniqueMock.mockResolvedValue(null);
    const res = await POST(
      postReq({ courseId: "c-ghost", title: "Intro" }),
    );
    expect(res.status).toBe(404);
  });

  it("appends to the tail when sortOrder is omitted", async () => {
    courseFindUniqueMock.mockResolvedValue({ id: "c1" });
    sectionFindFirstMock.mockResolvedValue({ sortOrder: 3 });
    sectionCreateMock.mockImplementation(async ({ data }) => ({
      id: "sec-new",
      ...data,
    }));
    const res = await POST(postReq({ courseId: "c1", title: "Module 4" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sortOrder).toBe(4);
  });

  it("uses sortOrder=0 when course has no existing sections", async () => {
    courseFindUniqueMock.mockResolvedValue({ id: "c1" });
    sectionFindFirstMock.mockResolvedValue(null);
    sectionCreateMock.mockImplementation(async ({ data }) => ({
      id: "sec-new",
      ...data,
    }));
    const res = await POST(postReq({ courseId: "c1", title: "First" }));
    const body = await res.json();
    expect(body.sortOrder).toBe(0);
  });

  it("respects explicit sortOrder + dripDays when provided", async () => {
    courseFindUniqueMock.mockResolvedValue({ id: "c1" });
    sectionCreateMock.mockImplementation(async ({ data }) => ({
      id: "sec-new",
      ...data,
    }));
    const res = await POST(
      postReq({
        courseId: "c1",
        title: "Day 7 module",
        sortOrder: 2,
        dripDays: 7,
      }),
    );
    const body = await res.json();
    expect(body.sortOrder).toBe(2);
    expect(body.dripDays).toBe(7);
    expect(sectionFindFirstMock).not.toHaveBeenCalled();
  });
});
