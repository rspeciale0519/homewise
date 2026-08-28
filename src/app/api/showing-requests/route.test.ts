import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  contactFindUniqueMock,
  contactCreateMock,
  taskCreateMock,
  logActivityMock,
  rateLimitConsumeMock,
} = vi.hoisted(() => ({
  contactFindUniqueMock: vi.fn(),
  contactCreateMock: vi.fn(),
  taskCreateMock: vi.fn(),
  logActivityMock: vi.fn(),
  rateLimitConsumeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      findUnique: contactFindUniqueMock,
      create: contactCreateMock,
    },
    task: { create: taskCreateMock },
  },
}));

vi.mock("@/lib/crm/log-activity", () => ({
  logActivity: logActivityMock,
}));

vi.mock("@/lib/public-rate-limit", () => ({
  clientIpRateRule: () => null,
  publicMutationRateLimiter: {
    consume: rateLimitConsumeMock,
  },
}));

import { POST } from "./route";

function request(overrides: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/showing-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Taylor",
      lastName: "Buyer",
      email: "taylor@example.com",
      phone: "",
      propertyId: "listing-1",
      propertyAddress: "123 Oak Ave, Orlando, FL",
      preferredDate: "",
      preferredTime: "",
      message: "",
      ...overrides,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  contactFindUniqueMock.mockResolvedValue(null);
  contactCreateMock.mockResolvedValue({ id: "contact-1" });
  taskCreateMock.mockResolvedValue({ id: "task-1" });
  logActivityMock.mockResolvedValue(undefined);
  rateLimitConsumeMock.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
});

describe("POST /api/showing-requests", () => {
  it("accepts the form payload when optional scheduling fields are blank", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(taskCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dueDate: null }),
      }),
    );
  });

  it("accepts the form time windows", async () => {
    const response = await POST(request({
      preferredDate: "2026-09-01",
      preferredTime: "afternoon",
    }));

    expect(response.status).toBe(201);
    expect(taskCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: expect.stringContaining("Preferred time: afternoon"),
          dueDate: new Date("2026-09-01"),
        }),
      }),
    );
  });

  it("returns 503 without creating CRM data when the limiter is unavailable", async () => {
    rateLimitConsumeMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 5,
      unavailable: true,
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(contactCreateMock).not.toHaveBeenCalled();
    expect(taskCreateMock).not.toHaveBeenCalled();
  });
});
