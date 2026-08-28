import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createClientMock,
  propertyAlertFindUniqueMock,
  propertyAlertCreateMock,
  propertyAlertUpdateMock,
  sendEmailMock,
  createConfirmationTokenMock,
  rateLimitConsumeMock,
  assertEmailActionSecretConfiguredMock,
  prepareAnonymousPropertyAlertMock,
  releasePropertyAlertEmailCooldownMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  propertyAlertFindUniqueMock: vi.fn(),
  propertyAlertCreateMock: vi.fn(),
  propertyAlertUpdateMock: vi.fn(),
  sendEmailMock: vi.fn(),
  createConfirmationTokenMock: vi.fn(),
  rateLimitConsumeMock: vi.fn(),
  assertEmailActionSecretConfiguredMock: vi.fn(),
  prepareAnonymousPropertyAlertMock: vi.fn(),
  releasePropertyAlertEmailCooldownMock: vi.fn(),
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

vi.mock("@/lib/email", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/email")>();
  return { ...original, sendEmail: sendEmailMock };
});

vi.mock("@/lib/email/action-token", () => ({
  createPropertyAlertConfirmationToken: createConfirmationTokenMock,
  assertEmailActionSecretConfigured: assertEmailActionSecretConfiguredMock,
}));

vi.mock("@/lib/property-alert-signup", () => ({
  prepareAnonymousPropertyAlert: prepareAnonymousPropertyAlertMock,
  releasePropertyAlertEmailCooldown: releasePropertyAlertEmailCooldownMock,
}));

vi.mock("@/lib/public-rate-limit", () => ({
  clientIpRateRule: vi.fn(() => ({ key: "ip:test", limit: 60 })),
  publicMutationRateLimiter: { consume: rateLimitConsumeMock },
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
    rateLimitConsumeMock.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    createConfirmationTokenMock.mockReturnValue("confirmation-token");
    sendEmailMock.mockResolvedValue({ id: "email-1", error: null });
    prepareAnonymousPropertyAlertMock.mockResolvedValue({
      kind: "confirmation",
      alertId: "alert-1",
      email: "buyer@example.com",
      name: "Buyer",
      verificationVersion: 1,
      sentAt: new Date("2026-08-27T12:00:00.000Z"),
    });
    releasePropertyAlertEmailCooldownMock.mockResolvedValue(undefined);
  });

  it("emails a confirmation without activating an anonymous alert", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    const response = await POST(createRequest());

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      pendingConfirmation: true,
    });
    expect(prepareAnonymousPropertyAlertMock).toHaveBeenCalledWith(basePayload);
    expect(createConfirmationTokenMock).toHaveBeenCalledWith({
      alertId: "alert-1",
      email: "buyer@example.com",
      verificationVersion: 1,
    });
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@example.com",
      subject: "Confirm your Homewise property alerts",
    }));
    expect(propertyAlertFindUniqueMock).not.toHaveBeenCalled();
    expect(propertyAlertUpdateMock).not.toHaveBeenCalled();
    expect(propertyAlertCreateMock).not.toHaveBeenCalled();
  });

  it("keeps a generic response and releases the cooldown after an email failure", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    sendEmailMock.mockResolvedValue({ id: null, error: "provider failure" });

    const response = await POST(createRequest());

    expect(response.status).toBe(202);
    expect(releasePropertyAlertEmailCooldownMock).toHaveBeenCalledWith(
      "alert-1",
      new Date("2026-08-27T12:00:00.000Z"),
    );
    expect(propertyAlertCreateMock).not.toHaveBeenCalled();
    expect(propertyAlertUpdateMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "denied",
      result: { allowed: false, retryAfterSeconds: 42 },
      status: 429,
      error: "Too many alert requests. Please try again later.",
    },
    {
      name: "unavailable",
      result: { allowed: false, retryAfterSeconds: 7, unavailable: true },
      status: 503,
      error: "The alert service is temporarily unavailable. Please try again later.",
    },
  ])("fails closed when the rate limiter is $name", async ({ result, status, error }) => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    rateLimitConsumeMock.mockReturnValue(result);

    const response = await POST(createRequest());

    expect(response.status).toBe(status);
    expect(response.headers.get("retry-after")).toBe(String(result.retryAfterSeconds));
    await expect(response.json()).resolves.toEqual({ error });
    expect(assertEmailActionSecretConfiguredMock).not.toHaveBeenCalled();
    expect(prepareAnonymousPropertyAlertMock).not.toHaveBeenCalled();
    expect(createConfirmationTokenMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(propertyAlertFindUniqueMock).not.toHaveBeenCalled();
    expect(propertyAlertCreateMock).not.toHaveBeenCalled();
    expect(propertyAlertUpdateMock).not.toHaveBeenCalled();
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
        verificationRequired: false,
        verificationVersion: { increment: 1 },
        emailVerifiedAt: expect.any(Date),
        userId: "user-1",
      },
    });
  });

});
