import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  automationRuleFindManyMock,
  contactFindUniqueMock,
  enrollmentUpsertMock,
  tagUpsertMock,
  contactTagUpsertMock,
  contactUpdateMock,
  sendEmailMock,
  createUnsubscribeTokenMock,
  canSendPreferenceEmailMock,
} = vi.hoisted(() => ({
  automationRuleFindManyMock: vi.fn(),
  contactFindUniqueMock: vi.fn(),
  enrollmentUpsertMock: vi.fn(),
  tagUpsertMock: vi.fn(),
  contactTagUpsertMock: vi.fn(),
  contactUpdateMock: vi.fn(),
  sendEmailMock: vi.fn(),
  createUnsubscribeTokenMock: vi.fn(),
  canSendPreferenceEmailMock: vi.fn(),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: (_config: unknown, _trigger: unknown, handler: unknown) => ({ handler }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    automationRule: { findMany: automationRuleFindManyMock },
    contact: { findUnique: contactFindUniqueMock, update: contactUpdateMock },
    campaignEnrollment: { upsert: enrollmentUpsertMock },
    tag: { upsert: tagUpsertMock },
    contactTag: { upsert: contactTagUpsertMock },
  },
}));

vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return { ...actual, sendEmail: sendEmailMock };
});

vi.mock("@/lib/email/action-token", () => ({
  createUnsubscribeToken: createUnsubscribeTokenMock,
}));

vi.mock("@/lib/email/suppression", () => ({
  canSendPreferenceEmail: canSendPreferenceEmailMock,
}));

import { processBehavioralTrigger } from "./behavioral-triggers";

type Handler = (input: {
  event: {
    data: {
      triggerType: string;
      contactId: string;
      metadata?: Record<string, unknown>;
    };
  };
  step: { run: (id: string, callback: () => Promise<unknown>) => Promise<unknown> };
}) => Promise<unknown>;

const handler = (processBehavioralTrigger as unknown as { handler: Handler }).handler;

beforeEach(() => {
  vi.clearAllMocks();
  automationRuleFindManyMock.mockResolvedValue([
    {
      id: "email-rule",
      triggerType: "email.opened",
      active: true,
      conditions: {},
      actionType: "send_email",
      actionData: { emailSubject: "Hello", emailBody: "<p>Hello</p>" },
    },
    {
      id: "campaign-rule",
      triggerType: "email.opened",
      active: true,
      conditions: {},
      actionType: "enroll_campaign",
      actionData: { campaignId: "campaign-1" },
    },
    {
      id: "tag-rule",
      triggerType: "email.opened",
      active: true,
      conditions: {},
      actionType: "add_tag",
      actionData: { tagName: "Engaged" },
    },
  ]);
  contactFindUniqueMock.mockResolvedValue({
    id: "contact-1",
    email: "contact@example.com",
    firstName: "Casey",
    lastName: "Contact",
    source: "website",
    type: "buyer",
    stage: "new_lead",
    marketingEmailOptOutAt: new Date("2026-08-27T12:00:00Z"),
  });
  tagUpsertMock.mockResolvedValue({ id: "tag-1" });
  contactTagUpsertMock.mockResolvedValue({ id: "contact-tag-1" });
  canSendPreferenceEmailMock.mockResolvedValue(true);
});

describe("behavioral email suppression", () => {
  it("skips email and campaign actions but keeps non-email actions", async () => {
    await handler({
      event: {
        data: { triggerType: "email.opened", contactId: "contact-1" },
      },
      step: {
        run: vi.fn((_id: string, callback: () => Promise<unknown>) => callback()),
      },
    });

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(createUnsubscribeTokenMock).not.toHaveBeenCalled();
    expect(enrollmentUpsertMock).not.toHaveBeenCalled();
    expect(tagUpsertMock).toHaveBeenCalledWith({
      where: { name: "Engaged" },
      create: { name: "Engaged" },
      update: {},
    });
    expect(contactTagUpsertMock).toHaveBeenCalledOnce();
  });

  it("skips an email when the contact opts out after recipient selection", async () => {
    automationRuleFindManyMock.mockResolvedValue([
      {
        id: "email-rule",
        triggerType: "email.opened",
        active: true,
        conditions: {},
        actionType: "send_email",
        actionData: { emailSubject: "Hello", emailBody: "<p>Hello</p>" },
      },
    ]);
    contactFindUniqueMock.mockResolvedValue({
      id: "contact-1",
      email: "contact@example.com",
      firstName: "Casey",
      lastName: "Contact",
      source: "website",
      type: "buyer",
      stage: "new_lead",
      marketingEmailOptOutAt: null,
    });
    canSendPreferenceEmailMock.mockResolvedValue(false);

    await handler({
      event: {
        data: { triggerType: "email.opened", contactId: "contact-1" },
      },
      step: {
        run: vi.fn((_id: string, callback: () => Promise<unknown>) => callback()),
      },
    });

    expect(canSendPreferenceEmailMock).toHaveBeenCalledWith({
      kind: "contact",
      id: "contact-1",
      recipientEmail: "contact@example.com",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
