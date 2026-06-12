import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { staffApiMock, listingFindUniqueMock, listingUpdateMock } = vi.hoisted(() => ({
  staffApiMock: vi.fn(),
  listingFindUniqueMock: vi.fn(),
  listingUpdateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin-api")>();
  return { ...original, requireStaffApi: staffApiMock };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findUnique: listingFindUniqueMock, update: listingUpdateMock },
  },
}));

import { DELETE, PATCH } from "./route";

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agent/manual-listings/l1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = { params: Promise.resolve({ id: "l1" }) };

const ownedManualRow = {
  id: "l1",
  mlsSource: "manual",
  createdByAgentId: "agent-1",
  photos: [],
  bathsFull: 2,
  bathsHalf: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  staffApiMock.mockResolvedValue({ isAdmin: false, agentId: "agent-1", user: {}, profile: {} });
});

describe("PATCH /api/agent/manual-listings/[id]", () => {
  it("never allows editing MLS-sourced listings", async () => {
    listingFindUniqueMock.mockResolvedValue({ ...ownedManualRow, mlsSource: "stellar" });

    const res = await PATCH(patchReq({ price: 1 }), params);

    expect(res.status).toBe(404);
    expect(listingUpdateMock).not.toHaveBeenCalled();
  });

  it("blocks agents from editing other agents' manual listings", async () => {
    listingFindUniqueMock.mockResolvedValue({ ...ownedManualRow, createdByAgentId: "someone-else" });

    const res = await PATCH(patchReq({ price: 1 }), params);

    expect(res.status).toBe(403);
    expect(listingUpdateMock).not.toHaveBeenCalled();
  });

  it("updates owned rows, recomputes baths, and resets approval to pending", async () => {
    listingFindUniqueMock.mockResolvedValue(ownedManualRow);
    listingUpdateMock.mockResolvedValue({ id: "l1" });

    const res = await PATCH(patchReq({ price: 450_000, bathsFull: 3 }), params);

    expect(res.status).toBe(200);
    const data = listingUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.price).toBe(450_000);
    expect(data.baths).toBe(3.5);
    expect(data.manualStatus).toBe("pending");
  });
});

describe("DELETE /api/agent/manual-listings/[id]", () => {
  it("archives instead of deleting", async () => {
    listingFindUniqueMock.mockResolvedValue(ownedManualRow);
    listingUpdateMock.mockResolvedValue({ id: "l1", manualStatus: "archived" });

    const res = await DELETE(patchReq({}), params);

    expect(res.status).toBe(200);
    expect(listingUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { manualStatus: "archived" } }),
    );
  });
});
