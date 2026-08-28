import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  listingFindFirstMock,
  rsvpFindFirstMock,
  rsvpCreateMock,
  agentFindFirstMock,
  sendEmailMock,
  rateLimitConsumeMock,
} = vi.hoisted(() => ({
  listingFindFirstMock: vi.fn(),
  rsvpFindFirstMock: vi.fn(),
  rsvpCreateMock: vi.fn(),
  agentFindFirstMock: vi.fn(),
  sendEmailMock: vi.fn(),
  rateLimitConsumeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findFirst: listingFindFirstMock },
    openHouseRsvp: { findFirst: rsvpFindFirstMock, create: rsvpCreateMock },
    agent: { findFirst: agentFindFirstMock },
  },
}));

vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));

vi.mock("@/lib/public-rate-limit", () => ({
  clientIpRateRule: vi.fn(() => ({ key: "ip:test", limit: 60 })),
  publicMutationRateLimiter: { consume: rateLimitConsumeMock },
}));

import { POST } from "./route";

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/open-house-rsvp", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  listingId: "listing-1",
  name: "Jane Buyer",
  email: "jane@example.com",
  slotDate: "2026-06-20",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DIRECT_MAIL_ADMIN_ALERT_EMAIL = "admin@homewisefl.com";
  rsvpFindFirstMock.mockResolvedValue(null);
  sendEmailMock.mockResolvedValue({ id: "email-1", error: null });
  rateLimitConsumeMock.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
});

describe("POST /api/open-house-rsvp", () => {
  it("rejects invalid payloads", async () => {
    const res = await POST(req({ listingId: "x", name: "", email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(rsvpCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the listing is not publicly visible", async () => {
    listingFindFirstMock.mockResolvedValue(null);

    const res = await POST(req(validBody));

    expect(res.status).toBe(404);
    const where = listingFindFirstMock.mock.calls[0]?.[0]?.where;
    expect(where.AND).toBeDefined();
    expect(rsvpCreateMock).not.toHaveBeenCalled();
  });

  it("creates the RSVP and notifies the matched agent", async () => {
    listingFindFirstMock.mockResolvedValue({
      id: "listing-1",
      address: "117 Dinner Lake Ave",
      city: "Lake Wales",
      listingAgentMlsId: "MFR123",
    });
    rsvpCreateMock.mockResolvedValue({ id: "rsvp-1" });
    agentFindFirstMock.mockResolvedValue({ email: "maria@homewisefl.com", firstName: "Maria" });

    const res = await POST(req(validBody));

    expect(res.status).toBe(201);
    expect(rsvpCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ listingId: "listing-1", name: "Jane Buyer", email: "jane@example.com" }),
      }),
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "maria@homewisefl.com" }),
    );
  });

  it("reuses a recent duplicate without sending another email", async () => {
    listingFindFirstMock.mockResolvedValue({
      id: "listing-1",
      address: "117 Dinner Lake Ave",
      city: "Lake Wales",
      listingAgentMlsId: "MFR123",
    });
    rsvpFindFirstMock.mockResolvedValue({ id: "rsvp-existing" });

    const res = await POST(req({ ...validBody, email: "duplicate@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "rsvp-existing" });
    expect(rsvpFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slotDate: validBody.slotDate }),
      }),
    );
    expect(rsvpCreateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("creates a separate RSVP for a different open-house date", async () => {
    listingFindFirstMock.mockResolvedValue({
      id: "listing-1",
      address: "117 Dinner Lake Ave",
      city: "Lake Wales",
      listingAgentMlsId: null,
    });
    rsvpFindFirstMock.mockImplementation(({ where }) => (
      Promise.resolve(where.slotDate === undefined ? { id: "rsvp-old-date" } : null)
    ));
    rsvpCreateMock.mockResolvedValue({ id: "rsvp-new-date" });

    const res = await POST(req({ ...validBody, slotDate: "2026-06-21" }));

    expect(res.status).toBe(201);
    expect(rsvpFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slotDate: "2026-06-21" }),
      }),
    );
    expect(rsvpCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slotDate: "2026-06-21" }),
      }),
    );
  });

  it("falls back to the admin alert address when no agent matches", async () => {
    listingFindFirstMock.mockResolvedValue({
      id: "listing-1",
      address: "117 Dinner Lake Ave",
      city: "Lake Wales",
      listingAgentMlsId: "MFR999",
    });
    rsvpCreateMock.mockResolvedValue({ id: "rsvp-2" });
    agentFindFirstMock.mockResolvedValue(null);

    const res = await POST(req(validBody));

    expect(res.status).toBe(201);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@homewisefl.com" }),
    );
  });

  it("still succeeds when the notification email fails", async () => {
    listingFindFirstMock.mockResolvedValue({
      id: "listing-1",
      address: "117 Dinner Lake Ave",
      city: "Lake Wales",
      listingAgentMlsId: null,
    });
    rsvpCreateMock.mockResolvedValue({ id: "rsvp-3" });
    sendEmailMock.mockRejectedValue(new Error("resend down"));

    const res = await POST(req(validBody));

    expect(res.status).toBe(201);
  });

  it("returns 503 before listing access when the shared limiter is unavailable", async () => {
    rateLimitConsumeMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 5,
      unavailable: true,
    });

    const res = await POST(req(validBody));

    expect(res.status).toBe(503);
    expect(listingFindFirstMock).not.toHaveBeenCalled();
    expect(rsvpCreateMock).not.toHaveBeenCalled();
  });

  it("returns 503 before creating an RSVP when notification limiting is unavailable", async () => {
    listingFindFirstMock.mockResolvedValue({
      id: "listing-1",
      address: "117 Dinner Lake Ave",
      city: "Lake Wales",
      listingAgentMlsId: "MFR123",
    });
    agentFindFirstMock.mockResolvedValue({
      email: "maria@homewisefl.com",
      firstName: "Maria",
    });
    rateLimitConsumeMock
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
      .mockResolvedValueOnce({
        allowed: false,
        retryAfterSeconds: 5,
        unavailable: true,
      });

    const res = await POST(req(validBody));

    expect(res.status).toBe(503);
    expect(rsvpCreateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
