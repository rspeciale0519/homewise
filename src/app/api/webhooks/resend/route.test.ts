import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  verifyMock,
  transactionMock,
  contactFindUniqueMock,
  contactUpdateMock,
  emailEventCreateMock,
  emailEventFindUniqueMock,
  emailEventUpdateMock,
  variantUpdateManyMock,
  rulesFindManyMock,
  inngestSendMock,
} = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  transactionMock: vi.fn(),
  contactFindUniqueMock: vi.fn(),
  contactUpdateMock: vi.fn(),
  emailEventCreateMock: vi.fn(),
  emailEventFindUniqueMock: vi.fn(),
  emailEventUpdateMock: vi.fn(),
  variantUpdateManyMock: vi.fn(),
  rulesFindManyMock: vi.fn(),
  inngestSendMock: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  verifyResendWebhook: verifyMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    emailEvent: { findUnique: emailEventFindUniqueMock },
  },
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: inngestSendMock },
}));

import { POST } from "./route";

const transactionClient = {
  contact: {
    findUnique: contactFindUniqueMock,
    update: contactUpdateMock,
  },
  emailEvent: {
    create: emailEventCreateMock,
    update: emailEventUpdateMock,
  },
  subjectLineVariant: { updateMany: variantUpdateManyMock },
  automationRule: { findMany: rulesFindManyMock },
};

const payload = {
  type: "email.opened",
  data: {
    email_id: "email_123",
    to: ["lead@example.com"],
    subject: "Welcome",
    tags: {
      campaign_id: "campaign_1",
      variant: "A",
    },
  },
};

type SignatureHeader = "svix-id" | "svix-timestamp" | "svix-signature";

function webhookRequest(
  body = JSON.stringify(payload),
  headerOverrides: Partial<Record<SignatureHeader, string | null>> = {},
): NextRequest {
  const headers = new Headers({
    "svix-id": "msg_webhook_123",
    "svix-timestamp": "1720000000",
    "svix-signature": "v1,signature",
  });
  for (const [name, value] of Object.entries(headerOverrides)) {
    if (value === null) headers.delete(name);
    else if (value !== undefined) headers.set(name, value);
  }

  return new NextRequest("https://example.test/api/webhooks/resend", {
    method: "POST",
    body,
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_test");
  verifyMock.mockReturnValue(payload);
  transactionMock.mockImplementation(
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
  contactFindUniqueMock.mockResolvedValue({ id: "contact_1" });
  contactUpdateMock.mockResolvedValue({ id: "contact_1" });
  emailEventCreateMock.mockResolvedValue({ id: "event_1" });
  emailEventUpdateMock.mockResolvedValue({ id: "event_1" });
  emailEventFindUniqueMock.mockResolvedValue({
    metadata: {
      homewiseBehavioralDispatch: {
        version: 1,
        targets: [
          {
            contactId: "contact_1",
            ruleId: "rule_1",
            triggerType: "email.opened",
          },
        ],
      },
    },
  });
  variantUpdateManyMock.mockResolvedValue({ count: 1 });
  rulesFindManyMock.mockResolvedValue([{ id: "rule_1" }]);
  inngestSendMock.mockResolvedValue({ ids: ["inngest_1"] });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/webhooks/resend", () => {
  it("fails closed when the webhook secret is missing", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook not configured" });
    expect(verifyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it("rejects a failed signature verification before database access", async () => {
    verifyMock.mockImplementationOnce(() => {
      throw new Error("invalid signature");
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid signature" });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing webhook id", { "svix-id": null }],
    ["a missing timestamp", { "svix-timestamp": null }],
    ["a missing signature", { "svix-signature": null }],
    ["an oversized webhook id", { "svix-id": "x".repeat(201) }],
    ["an oversized timestamp", { "svix-timestamp": "x".repeat(101) }],
    ["an oversized signature", { "svix-signature": "x".repeat(2_001) }],
  ] satisfies Array<[
    string,
    Partial<Record<SignatureHeader, string | null>>,
  ]>)("rejects %s before signature verification", async (_name, headerOverrides) => {
    const response = await POST(webhookRequest(JSON.stringify(payload), headerOverrides));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid signature" });
    expect(verifyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it("verifies the exact raw body and applies event effects atomically", async () => {
    const rawBody = '{"signed":"raw body"}';
    verifyMock.mockReturnValue(payload);

    const response = await POST(webhookRequest(rawBody));

    expect(response.status).toBe(200);
    expect(verifyMock).toHaveBeenCalledWith({
      payload: rawBody,
      headers: {
        id: "msg_webhook_123",
        timestamp: "1720000000",
        signature: "v1,signature",
      },
      webhookSecret: "whsec_test",
    });
    expect(transactionMock).toHaveBeenCalledOnce();

    const expectedEventId = `resend_${createHash("sha256")
      .update("msg_webhook_123")
      .digest("hex")}`;
    expect(emailEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expectedEventId,
        contactId: null,
        type: "email.opened",
      }),
    });
    expect(emailEventUpdateMock).toHaveBeenCalledWith({
      where: { id: expectedEventId },
      data: expect.objectContaining({
        contactId: "contact_1",
        metadata: expect.objectContaining({
          homewiseBehavioralDispatch: {
            version: 1,
            targets: [
              {
                contactId: "contact_1",
                ruleId: "rule_1",
                triggerType: "email.opened",
              },
            ],
          },
        }),
      }),
    });
    expect(emailEventCreateMock.mock.invocationCallOrder[0]).toBeLessThan(
      contactFindUniqueMock.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(contactUpdateMock).toHaveBeenCalledWith({
      where: { id: "contact_1" },
      data: { score: { increment: 2 } },
    });
    expect(variantUpdateManyMock).toHaveBeenCalledWith({
      where: { campaignEmailId: "campaign_1", variant: "A" },
      data: { openCount: { increment: 1 } },
    });
    expect(inngestSendMock).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.stringMatching(/^resend_behavior_[0-9a-f]{64}$/),
        name: "crm/behavioral.trigger",
        data: {
          contactId: "contact_1",
          ruleId: "rule_1",
          triggerType: "email.opened",
        },
      }),
    ]);
    expect(transactionMock.mock.invocationCallOrder[0]).toBeLessThan(
      inngestSendMock.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("replays only the deterministic dispatch for a duplicate signed event", async () => {
    const duplicateError = Object.assign(new Error("duplicate"), { code: "P2002" });
    emailEventCreateMock.mockRejectedValueOnce(duplicateError);
    contactFindUniqueMock.mockResolvedValue({ id: "contact_changed" });
    rulesFindManyMock.mockResolvedValue([{ id: "rule_new" }]);
    emailEventFindUniqueMock.mockResolvedValueOnce({
      metadata: {
        homewiseBehavioralDispatch: {
          version: 1,
          targets: [
            {
              contactId: "contact_original",
              ruleId: "rule_original",
              triggerType: "email.opened",
            },
          ],
        },
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(inngestSendMock).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.stringMatching(/^resend_behavior_[0-9a-f]{64}$/),
        data: {
          contactId: "contact_original",
          ruleId: "rule_original",
          triggerType: "email.opened",
        },
      }),
    ]);
    expect(emailEventFindUniqueMock).toHaveBeenCalledWith({
      where: {
        id: expect.stringMatching(/^resend_[0-9a-f]{64}$/),
      },
      select: { metadata: true },
    });
    expect(contactFindUniqueMock).not.toHaveBeenCalled();
    expect(rulesFindManyMock).not.toHaveBeenCalled();
    expect(contactUpdateMock).not.toHaveBeenCalled();
  });

  it("recovers a committed event after its first dispatch fails", async () => {
    const duplicateError = Object.assign(new Error("duplicate"), { code: "P2002" });
    emailEventCreateMock
      .mockResolvedValueOnce({ id: "event_1" })
      .mockRejectedValueOnce(duplicateError);
    inngestSendMock
      .mockRejectedValueOnce(new Error("dispatch unavailable"))
      .mockResolvedValueOnce({ ids: ["inngest_1"] });

    const firstResponse = await POST(webhookRequest());
    const retryResponse = await POST(webhookRequest());

    expect(firstResponse.status).toBe(500);
    expect(retryResponse.status).toBe(200);
    expect(inngestSendMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid verified payload before database access", async () => {
    verifyMock.mockReturnValue({ type: "email.opened", data: { to: [""] } });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized raw body before signature work", async () => {
    const response = await POST(webhookRequest("x".repeat(128 * 1024 + 1)));

    expect(response.status).toBe(413);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
