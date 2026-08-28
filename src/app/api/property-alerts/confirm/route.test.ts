import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  verifyToken,
  matchesRecipient,
  findUnique,
  updateMany,
  consume,
} = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  matchesRecipient: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  consume: vi.fn(),
}));

vi.mock("@/lib/email/action-token", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/email/action-token")>();
  return {
    ...original,
    verifyEmailActionToken: verifyToken,
    emailActionMatchesRecipient: matchesRecipient,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: { propertyAlert: { findUnique, updateMany } },
}));

vi.mock("@/lib/public-rate-limit", () => ({
  clientIpRateRule: vi.fn(() => ({ key: "ip:test", limit: 60 })),
  publicMutationRateLimiter: { consume },
}));

import { POST } from "./route";

function request(token = "valid-token") {
  return new NextRequest("http://localhost/api/property-alerts/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

describe("POST /api/property-alerts/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consume.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    verifyToken.mockReturnValue({
      purpose: "property_alert_confirmation",
      subjectId: "alert-1",
      verificationVersion: 2,
      recipientBinding: "binding",
    });
    matchesRecipient.mockReturnValue(true);
    findUnique.mockResolvedValue({
      email: "buyer@example.com",
      verificationRequired: true,
      verificationVersion: 2,
    });
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("activates the matching pending alert once", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "alert-1",
        active: false,
        verificationRequired: true,
        verificationVersion: 2,
      },
      data: {
        active: true,
        verificationRequired: false,
        emailVerifiedAt: expect.any(Date),
        verificationVersion: { increment: 1 },
      },
    });
  });

  it("does not write when the recipient binding differs", async () => {
    matchesRecipient.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "denied",
      result: { allowed: false, retryAfterSeconds: 33 },
      status: 429,
      error: "Too many confirmation requests. Please try again later.",
    },
    {
      name: "unavailable",
      result: { allowed: false, retryAfterSeconds: 6, unavailable: true },
      status: 503,
      error: "The confirmation service is temporarily unavailable. Please try again later.",
    },
  ])("fails closed when the rate limiter is $name", async ({ result, status, error }) => {
    consume.mockReturnValue(result);

    const response = await POST(request());

    expect(response.status).toBe(status);
    expect(response.headers.get("retry-after")).toBe(String(result.retryAfterSeconds));
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error });
    expect(verifyToken).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(matchesRecipient).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns the same error for a stale confirmation", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This confirmation link is invalid, expired, or already used.",
    });
  });

});
