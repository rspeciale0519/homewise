import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAuthApiMock,
  agentFindUniqueMock,
  productConfigFindManyMock,
  getGraceStatusMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  productConfigFindManyMock: vi.fn(),
  getGraceStatusMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAuthApi: requireAuthApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: { findUnique: agentFindUniqueMock },
    productConfig: { findMany: productConfigFindManyMock },
  },
}));

vi.mock("@/lib/billing/grace-period", () => ({
  getGraceStatus: getGraceStatusMock,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue({ user: { id: "user-1" } });
  agentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    firstName: "Riley",
    lastName: "Realtor",
    email: "riley@example.com",
    platform: "riusa",
    subscription: null,
    stripeCustomer: null,
  });
  getGraceStatusMock.mockResolvedValue({ inGracePeriod: false });
  productConfigFindManyMock.mockResolvedValue([]);
});

describe("GET /api/billing/subscription", () => {
  it("loads only products for the authenticated agent platform", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(productConfigFindManyMock).toHaveBeenCalledWith({
      where: { isActive: true, platforms: { has: "riusa" } },
      include: { features: true },
      orderBy: { sortOrder: "asc" },
    });
  });
});
