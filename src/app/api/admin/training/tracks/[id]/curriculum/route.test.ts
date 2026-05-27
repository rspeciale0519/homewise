import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  courseFindUniqueMock,
  transactionMock,
  itemDeleteManyMock,
  sectionFindManyMock,
  sectionDeleteManyMock,
  sectionUpdateMock,
  sectionCreateMock,
  itemCreateMock,
  finalFindUniqueMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  courseFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  itemDeleteManyMock: vi.fn(),
  sectionFindManyMock: vi.fn(),
  sectionDeleteManyMock: vi.fn(),
  sectionUpdateMock: vi.fn(),
  sectionCreateMock: vi.fn(),
  itemCreateMock: vi.fn(),
  finalFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingCourse: { findUnique: courseFindUniqueMock },
    $transaction: transactionMock,
  },
}));

import { PUT } from "./route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/tracks/c1/curriculum", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

function buildTx() {
  return {
    trainingCourseItem: {
      deleteMany: itemDeleteManyMock,
      create: itemCreateMock,
    },
    trainingSection: {
      findMany: sectionFindManyMock,
      deleteMany: sectionDeleteManyMock,
      update: sectionUpdateMock,
      create: sectionCreateMock,
    },
    trainingCourse: { findUnique: finalFindUniqueMock },
  };
}

const adminAuth = {
  user: { id: "admin-1", email: "a@x.com" },
  profile: { role: "admin" },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
});

describe("PUT /api/admin/training/tracks/[id]/curriculum", () => {
  const ctx = { params: Promise.resolve({ id: "c1" }) };

  it("returns 403 when caller is not admin", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response("forbidden", { status: 403 }),
    });
    const res = await PUT(makeReq({ sections: [] }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body shape", async () => {
    const res = await PUT(makeReq({}), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when course does not exist", async () => {
    courseFindUniqueMock.mockResolvedValue(null);
    const res = await PUT(makeReq({ sections: [] }), ctx);
    expect(res.status).toBe(404);
  });

  it("rebuilds curriculum: drops items, drops stale sections, updates kept, creates new", async () => {
    courseFindUniqueMock.mockResolvedValue({ id: "c1" });
    sectionFindManyMock.mockResolvedValue([{ id: "sec-old1" }, { id: "sec-old2" }]);
    sectionUpdateMock.mockResolvedValue({});
    sectionCreateMock.mockResolvedValue({ id: "sec-new" });
    itemCreateMock.mockResolvedValue({});
    finalFindUniqueMock.mockResolvedValue({ id: "c1", sections: [] });

    transactionMock.mockImplementation(async (fn) => fn(buildTx()));

    const res = await PUT(
      makeReq({
        sections: [
          { id: "sec-old1", title: "Module 1 renamed", contentIds: ["d1", "d2"] },
          { title: "Brand-new Section", contentIds: ["d3"] },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(itemDeleteManyMock).toHaveBeenCalledWith({
      where: { courseId: "c1" },
    });
    expect(sectionDeleteManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["sec-old2"] } },
    });
    expect(sectionUpdateMock).toHaveBeenCalledWith({
      where: { id: "sec-old1" },
      data: { title: "Module 1 renamed", sortOrder: 0, dripDays: null },
    });
    expect(sectionCreateMock).toHaveBeenCalledWith({
      data: {
        courseId: "c1",
        title: "Brand-new Section",
        sortOrder: 1,
        dripDays: null,
      },
    });
    expect(itemCreateMock).toHaveBeenCalledTimes(3);
  });

  it("creates items with the correct sortOrder per section", async () => {
    courseFindUniqueMock.mockResolvedValue({ id: "c1" });
    sectionFindManyMock.mockResolvedValue([]);
    sectionCreateMock.mockResolvedValue({ id: "sec-A" });
    itemCreateMock.mockResolvedValue({});
    finalFindUniqueMock.mockResolvedValue({ id: "c1" });

    transactionMock.mockImplementation(async (fn) => fn(buildTx()));

    await PUT(
      makeReq({
        sections: [
          { title: "Only Section", contentIds: ["d10", "d20", "d30"] },
        ],
      }),
      ctx,
    );

    expect(itemCreateMock).toHaveBeenNthCalledWith(1, {
      data: { courseId: "c1", sectionId: "sec-A", contentId: "d10", sortOrder: 0 },
    });
    expect(itemCreateMock).toHaveBeenNthCalledWith(2, {
      data: { courseId: "c1", sectionId: "sec-A", contentId: "d20", sortOrder: 1 },
    });
    expect(itemCreateMock).toHaveBeenNthCalledWith(3, {
      data: { courseId: "c1", sectionId: "sec-A", contentId: "d30", sortOrder: 2 },
    });
  });

  it("rejects when the section list is over the 50-cap", async () => {
    const sections = Array.from({ length: 51 }, (_, i) => ({
      title: `S${i}`,
      contentIds: [],
    }));
    const res = await PUT(makeReq({ sections }), ctx);
    expect(res.status).toBe(400);
  });
});
