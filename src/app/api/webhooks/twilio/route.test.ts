import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

const {
  validateRequestMock,
  contactFindManyMock,
  activityFindFirstMock,
  activityCreateMock,
} = vi.hoisted(() => ({
  validateRequestMock: vi.fn(),
  contactFindManyMock: vi.fn(),
  activityFindFirstMock: vi.fn(),
  activityCreateMock: vi.fn(),
}));

vi.mock("twilio", () => ({
  default: { validateRequest: validateRequestMock },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: { findMany: contactFindManyMock },
    activityEvent: {
      findFirst: activityFindFirstMock,
      create: activityCreateMock,
    },
  },
}));

import { POST } from "./route";

function webhookRequest(
  fields: Record<string, string> = {
    From: "+15551234567",
    Body: "Please call me",
    MessageSid: "SM1234567890abcdef",
  },
): NextRequest {
  return new NextRequest("https://example.test/api/webhooks/twilio", {
    method: "POST",
    body: new URLSearchParams(fields).toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": "twilio-signature",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TWILIO_AUTH_TOKEN", "auth-token");
  validateRequestMock.mockReturnValue(true);
  contactFindManyMock.mockResolvedValue([
    { id: "contact_1", phone: "+1 (555) 123-4567" },
  ]);
  activityFindFirstMock.mockResolvedValue(null);
  activityCreateMock.mockResolvedValue({ id: "activity_1" });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/webhooks/twilio", () => {
  it("validates the signed URL and decoded form parameters", async () => {
    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(validateRequestMock).toHaveBeenCalledWith(
      "auth-token",
      "twilio-signature",
      "https://example.test/api/webhooks/twilio",
      {
        From: "+15551234567",
        Body: "Please call me",
        MessageSid: "SM1234567890abcdef",
      },
    );
    expect(activityCreateMock).toHaveBeenCalledWith({
      data: {
        id: `twilio_${createHash("sha256")
          .update("SM1234567890abcdef")
          .digest("hex")}`,
        contactId: "contact_1",
        type: "sms_reply",
        title: "SMS Reply Received",
        description: "Please call me",
        metadata: {
          messageSid: "SM1234567890abcdef",
          from: "+15551234567",
        },
      },
    });
    await expect(response.text()).resolves.toContain("<Message>");
  });

  it("does not log or reply again for a sequential duplicate MessageSid", async () => {
    activityFindFirstMock.mockResolvedValue({ id: "activity_existing" });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(activityFindFirstMock).toHaveBeenCalledWith({
      where: {
        contactId: "contact_1",
        type: "sms_reply",
        metadata: {
          path: ["messageSid"],
          equals: "SM1234567890abcdef",
        },
      },
      select: { id: true },
    });
    expect(activityCreateMock).not.toHaveBeenCalled();
    await expect(response.text()).resolves.not.toContain("<Message>");
  });

  it("does not reply when a concurrent delivery wins the deterministic ID", async () => {
    activityCreateMock.mockRejectedValueOnce(
      Object.assign(new Error("duplicate"), { code: "P2002" }),
    );

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.not.toContain("<Message>");
  });

  it("matches only an exact E.164-equivalent stored phone", async () => {
    contactFindManyMock.mockResolvedValue([
      { id: "wrong_contact", phone: "+44 1555 123 4567" },
      { id: "contact_1", phone: "(555) 123-4567" },
    ]);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(contactFindManyMock).toHaveBeenCalledWith({
      where: { phone: { not: null } },
      orderBy: { id: "asc" },
      take: 250,
      select: { id: true, phone: true },
    });
    expect(activityCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ contactId: "contact_1" }),
    });
  });

  it("rejects ambiguous exact phone matches", async () => {
    contactFindManyMock.mockResolvedValue([
      { id: "contact_1", phone: "+1 555 123 4567" },
      { id: "contact_2", phone: "(555) 123-4567" },
    ]);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(409);
    expect(activityFindFirstMock).not.toHaveBeenCalled();
    expect(activityCreateMock).not.toHaveBeenCalled();
    await expect(response.text()).resolves.not.toContain("<Message>");
  });

  it("rejects an invalid signature before database access", async () => {
    validateRequestMock.mockReturnValue(false);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(401);
    expect(contactFindManyMock).not.toHaveBeenCalled();
    expect(activityFindFirstMock).not.toHaveBeenCalled();
  });

  it("rejects a form body over the byte limit", async () => {
    const response = await POST(
      webhookRequest({
        From: "+15551234567",
        Body: "x".repeat(33 * 1024),
        MessageSid: "SM1234567890abcdef",
      }),
    );

    expect(response.status).toBe(413);
    expect(validateRequestMock).not.toHaveBeenCalled();
    expect(contactFindManyMock).not.toHaveBeenCalled();
  });

  it("rejects a missing MessageSid after signature verification", async () => {
    const response = await POST(
      webhookRequest({ From: "+15551234567", Body: "Please call me" }),
    );

    expect(response.status).toBe(400);
    expect(validateRequestMock).toHaveBeenCalledOnce();
    expect(contactFindManyMock).not.toHaveBeenCalled();
  });

  it("returns 500 when database processing fails so Twilio can retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    activityCreateMock.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.not.toContain("<Message>");
  });
});
