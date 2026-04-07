import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createClientMock,
  propertyAlertFindUniqueMock,
  propertyAlertCreateMock,
  propertyAlertUpdateMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  propertyAlertFindUniqueMock: vi.fn(),
  propertyAlertCreateMock: vi.fn(),
  propertyAlertUpdateMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    propertyAlert: {
      findUnique: propertyAlertFindUniqueMock,
      create: propertyAlertCreateMock,
      update: propertyAlertUpdateMock,
    },
  },
}));

import { POST } from "@/app/api/property-alerts/route";

const basePayload = {
  email: "buyer@example.com",
  name: "Buyer",
  cities: ["Orlando"],
  minPrice: 300000,
  maxPrice: 500000,
  beds: 3,
};

function createRequest(payload = basePayload) {
  return new NextRequest("http://localhost/api/property-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("/api/property-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a conflict when an anonymous user tries to update an existing alert", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    propertyAlertFindUniqueMock.mockResolvedValue({ email: "buyer@example.com" });

    const response = await POST(createRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "An alert already exists for this email. Sign in to update your saved criteria.",
    });
    expect(propertyAlertUpdateMock).not.toHaveBeenCalled();
    expect(propertyAlertCreateMock).not.toHaveBeenCalled();
  });

  it("updates an existing alert for the authenticated owner", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1", email: "buyer@example.com" },
          },
        }),
      },
    });
    propertyAlertFindUniqueMock.mockResolvedValue({ email: "buyer@example.com" });
    propertyAlertUpdateMock.mockResolvedValue({ id: "alert-1" });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(propertyAlertUpdateMock).toHaveBeenCalledWith({
      where: { email: "buyer@example.com" },
      data: {
        name: "Buyer",
        cities: ["Orlando"],
        minPrice: 300000,
        maxPrice: 500000,
        beds: 3,
        active: true,
        userId: "user-1",
      },
    });
  });
});
