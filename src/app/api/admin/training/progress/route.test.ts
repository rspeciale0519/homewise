import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminApiMock,
  contentCountMock,
  enrollCountMock,
  userFindManyMock,
  progressFindManyMock,
  enrollFindManyMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  contentCountMock: vi.fn(),
  enrollCountMock: vi.fn(),
  userFindManyMock: vi.fn(),
  progressFindManyMock: vi.fn(),
  enrollFindManyMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingContent: { count: contentCountMock },
    trainingEnrollment: { count: enrollCountMock, findMany: enrollFindManyMock },
    userProfile: { findMany: userFindManyMock },
    trainingProgress: { findMany: progressFindManyMock },
  },
}));

import { GET } from "./route";

const forbidden = { error: new Response("forbidden", { status: 403 }) };
const adminAuth = { user: { id: "admin-1" }, profile: { role: "admin" } };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
});

describe("GET /api/admin/training/progress", () => {
  it("returns 403 for a non-admin caller and never reads the roster", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("returns roster stats for an admin", async () => {
    contentCountMock.mockResolvedValue(0);
    enrollCountMock.mockResolvedValue(0);
    userFindManyMock.mockResolvedValue([]);
    progressFindManyMock.mockResolvedValue([]);
    enrollFindManyMock.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(userFindManyMock).toHaveBeenCalled();
  });
});
