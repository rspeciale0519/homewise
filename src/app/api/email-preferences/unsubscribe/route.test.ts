import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  matchesRecipient: vi.fn(),
  consume: vi.fn(),
  propertyAlertFind: vi.fn(),
  propertyAlertUpdate: vi.fn(),
  savedSearchFind: vi.fn(),
  savedSearchUpdate: vi.fn(),
  contactFind: vi.fn(),
  contactUpdate: vi.fn(),
  enrollmentUpdate: vi.fn(),
  userFind: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/email/action-token", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/email/action-token")>();
  return {
    ...original,
    verifyEmailActionToken: mocks.verifyToken,
    emailActionMatchesRecipient: mocks.matchesRecipient,
  };
});

vi.mock("@/lib/public-rate-limit", () => ({
  clientIpRateRule: vi.fn(() => ({ key: "ip:test", limit: 120 })),
  publicMutationRateLimiter: { consume: mocks.consume },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    propertyAlert: { findUnique: mocks.propertyAlertFind, updateMany: mocks.propertyAlertUpdate },
    savedSearch: { findUnique: mocks.savedSearchFind, updateMany: mocks.savedSearchUpdate },
    contact: { findUnique: mocks.contactFind, updateMany: mocks.contactUpdate },
    campaignEnrollment: { updateMany: mocks.enrollmentUpdate },
    userProfile: { findUnique: mocks.userFind, updateMany: mocks.userUpdate },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "./route";

function request() {
  return new NextRequest("http://localhost/api/email-preferences/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "signed-token" }),
  });
}

describe("POST /api/email-preferences/unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consume.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.matchesRecipient.mockReturnValue(true);
    mocks.transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));
  });

  it("disables a property alert", async () => {
    mocks.verifyToken.mockReturnValue({
      purpose: "unsubscribe",
      target: { kind: "property_alert", id: "alert-1" },
    });
    mocks.propertyAlertFind.mockResolvedValue({ email: "buyer@example.com" });
    mocks.propertyAlertUpdate.mockResolvedValue({ count: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.propertyAlertUpdate).toHaveBeenCalledWith({
      where: { id: "alert-1", email: "buyer@example.com" },
      data: { active: false },
    });
  });

  it("disables a saved search", async () => {
    mocks.verifyToken.mockReturnValue({
      purpose: "unsubscribe",
      target: { kind: "saved_search", id: "search-1" },
    });
    mocks.savedSearchFind.mockResolvedValue({
      userId: "user-1",
      user: { email: "buyer@example.com" },
    });
    mocks.savedSearchUpdate.mockResolvedValue({ count: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.savedSearchUpdate).toHaveBeenCalledWith({
      where: { id: "search-1", userId: "user-1" },
      data: { alertEnabled: false },
    });
  });

  it("records contact opt-out and stops active campaign emails", async () => {
    mocks.verifyToken.mockReturnValue({
      purpose: "unsubscribe",
      target: { kind: "contact", id: "contact-1" },
    });
    mocks.contactFind.mockResolvedValue({ email: "buyer@example.com" });
    mocks.contactUpdate.mockResolvedValue({ count: 1 });
    mocks.enrollmentUpdate.mockResolvedValue({ count: 2 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.enrollmentUpdate).toHaveBeenCalledWith({
      where: { contactId: "contact-1", status: "active" },
      data: { status: "unsubscribed", nextSendAt: null },
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("disables favorite price alerts", async () => {
    mocks.verifyToken.mockReturnValue({
      purpose: "unsubscribe",
      target: { kind: "user", id: "user-1" },
    });
    mocks.userFind.mockResolvedValue({ email: "buyer@example.com" });
    mocks.userUpdate.mockResolvedValue({ count: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1", email: "buyer@example.com" },
      data: { favoritePriceAlertsEnabled: false },
    });
  });

  it("does not write when recipient binding fails", async () => {
    mocks.verifyToken.mockReturnValue({
      purpose: "unsubscribe",
      target: { kind: "property_alert", id: "alert-1" },
    });
    mocks.propertyAlertFind.mockResolvedValue({ email: "buyer@example.com" });
    mocks.matchesRecipient.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.propertyAlertUpdate).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "denied",
      result: { allowed: false, retryAfterSeconds: 55 },
      status: 429,
      error: "Too many requests. Please try again later.",
    },
    {
      name: "unavailable",
      result: { allowed: false, retryAfterSeconds: 8, unavailable: true },
      status: 503,
      error: "The unsubscribe service is temporarily unavailable. Please try again later.",
    },
  ])("fails closed when the rate limiter is $name", async ({ result, status, error }) => {
    mocks.consume.mockReturnValue(result);

    const response = await POST(request());

    expect(response.status).toBe(status);
    expect(response.headers.get("retry-after")).toBe(String(result.retryAfterSeconds));
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error });
    expect(mocks.verifyToken).not.toHaveBeenCalled();
    expect(mocks.matchesRecipient).not.toHaveBeenCalled();
    expect(mocks.propertyAlertFind).not.toHaveBeenCalled();
    expect(mocks.savedSearchFind).not.toHaveBeenCalled();
    expect(mocks.contactFind).not.toHaveBeenCalled();
    expect(mocks.userFind).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

});
