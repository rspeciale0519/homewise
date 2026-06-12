import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { staffApiMock, listingCreateMock, listingFindManyMock, agentFindUniqueMock } = vi.hoisted(() => ({
  staffApiMock: vi.fn(),
  listingCreateMock: vi.fn(),
  listingFindManyMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin-api")>();
  return { ...original, requireStaffApi: staffApiMock };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { create: listingCreateMock, findMany: listingFindManyMock },
    agent: { findUnique: agentFindUniqueMock },
  },
}));

import { GET, POST } from "./route";

const validBody = {
  address: "1 Pocket Ln",
  city: "Orlando",
  zip: "32801",
  price: 500_000,
  beds: 3,
  bathsFull: 2,
  sqft: 1800,
  propertyType: "Residential",
};

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agent/manual-listings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  staffApiMock.mockResolvedValue({ isAdmin: false, agentId: "agent-1", user: {}, profile: {} });
  agentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    firstName: "Maria",
    lastName: "Alvarez",
    email: "maria@homewisefl.com",
    phone: "(407) 555-0101",
    mlsAgentId: "mfr123",
  });
});

describe("POST /api/agent/manual-listings", () => {
  it("creates a pending manual listing owned by the agent", async () => {
    listingCreateMock.mockResolvedValue({ id: "l1" });

    const res = await POST(postReq(validBody));

    expect(res.status).toBe(201);
    const data = listingCreateMock.mock.calls[0]?.[0]?.data;
    expect(data.mlsSource).toBe("manual");
    expect(data.manualStatus).toBe("pending");
    expect(data.createdByAgentId).toBe("agent-1");
    expect(data.mlsId).toMatch(/^MANUAL-/);
    expect(data.mlgCanUse).toEqual([]);
    expect(data.baths).toBe(2);
    expect(data.listingAgentMlsId).toBe("MFR123");
  });

  it("rejects invalid payloads", async () => {
    const res = await POST(postReq({ address: "" }));
    expect(res.status).toBe(400);
    expect(listingCreateMock).not.toHaveBeenCalled();
  });

  it("rejects users without a linked agent profile", async () => {
    staffApiMock.mockResolvedValue({ isAdmin: false, agentId: null, user: {}, profile: {} });

    const res = await POST(postReq(validBody));

    expect(res.status).toBe(403);
  });
});

describe("GET /api/agent/manual-listings", () => {
  it("scopes non-admin reads to the agent's own manual listings", async () => {
    listingFindManyMock.mockResolvedValue([]);

    await GET();

    const where = listingFindManyMock.mock.calls[0]?.[0]?.where;
    expect(where).toEqual({ mlsSource: "manual", createdByAgentId: "agent-1" });
  });
});
