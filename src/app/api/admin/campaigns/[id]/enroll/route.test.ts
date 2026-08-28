import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  campaignFindUniqueMock,
  contactFindManyMock,
  enrollmentUpsertMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  campaignFindUniqueMock: vi.fn(),
  contactFindManyMock: vi.fn(),
  enrollmentUpsertMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: campaignFindUniqueMock },
    contact: { findMany: contactFindManyMock },
    campaignEnrollment: { upsert: enrollmentUpsertMock },
  },
}));

import { POST } from "./route";

function request(contactIds: string[]): NextRequest {
  return new NextRequest("http://localhost/api/admin/campaigns/campaign-1/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactIds }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue({
    user: { id: "admin-1" },
    profile: { role: "admin" },
  });
  campaignFindUniqueMock.mockResolvedValue({ id: "campaign-1", emails: [] });
  enrollmentUpsertMock.mockResolvedValue({ id: "enrollment-1" });
});

describe("POST /api/admin/campaigns/[id]/enroll", () => {
  it("enrolls only contacts who have not opted out of marketing email", async () => {
    contactFindManyMock.mockResolvedValue([{ id: "contact-1" }]);

    const response = await POST(request(["contact-1", "contact-2"]), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(contactFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ["contact-1", "contact-2"] },
        marketingEmailOptOutAt: null,
      },
      select: { id: true },
    });
    expect(enrollmentUpsertMock).toHaveBeenCalledTimes(1);
    expect(enrollmentUpsertMock).toHaveBeenCalledWith({
      where: {
        campaignId_contactId: {
          campaignId: "campaign-1",
          contactId: "contact-1",
        },
      },
      create: {
        campaignId: "campaign-1",
        contactId: "contact-1",
        currentStep: 0,
        nextSendAt: expect.any(Date),
      },
      update: {},
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ enrolled: 1 });
  });

  it("does not enroll any opted-out contacts", async () => {
    contactFindManyMock.mockResolvedValue([]);

    const response = await POST(request(["contact-2"]), {
      params: Promise.resolve({ id: "campaign-1" }),
    });

    expect(enrollmentUpsertMock).not.toHaveBeenCalled();
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ enrolled: 0 });
  });
});
