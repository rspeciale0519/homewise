import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { listingFindFirstMock, rsvpCreateMock, agentFindFirstMock, sendEmailMock } = vi.hoisted(() => ({
  listingFindFirstMock: vi.fn(),
  rsvpCreateMock: vi.fn(),
  agentFindFirstMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findFirst: listingFindFirstMock },
    openHouseRsvp: { create: rsvpCreateMock },
    agent: { findFirst: agentFindFirstMock },
  },
}));

vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));

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
  sendEmailMock.mockResolvedValue({ id: "email-1", error: null });
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
    expect(where.OR ?? where.mlgCanUse).toBeDefined();
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
});
