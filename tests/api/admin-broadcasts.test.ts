import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  contactTagFindManyMock,
  contactFindManyMock,
  broadcastCreateMock,
  broadcastUpdateMock,
  sendEmailMock,
  createUnsubscribeTokenMock,
  canSendPreferenceEmailMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  contactTagFindManyMock: vi.fn(),
  contactFindManyMock: vi.fn(),
  broadcastCreateMock: vi.fn(),
  broadcastUpdateMock: vi.fn(),
  sendEmailMock: vi.fn(),
  createUnsubscribeTokenMock: vi.fn(),
  canSendPreferenceEmailMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactTag: { findMany: contactTagFindManyMock },
    contact: { findMany: contactFindManyMock },
    broadcast: {
      create: broadcastCreateMock,
      update: broadcastUpdateMock,
    },
  },
}));

vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: sendEmailMock,
  };
});

vi.mock("@/lib/email/action-token", () => ({
  createUnsubscribeToken: createUnsubscribeTokenMock,
}));

vi.mock("@/lib/email/suppression", () => ({
  canSendPreferenceEmail: canSendPreferenceEmailMock,
}));

import { POST } from "@/app/api/admin/broadcasts/route";

describe("/api/admin/broadcasts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    sendEmailMock.mockResolvedValue({ error: null });
    createUnsubscribeTokenMock.mockImplementation(
      (target: { kind: string; id: string }) => `signed/${target.kind}/${target.id}`,
    );
    canSendPreferenceEmailMock.mockResolvedValue(true);
  });

  it("sends to all contacts when no explicit audience is provided and sanitizes the stored body", async () => {
    contactFindManyMock
      .mockResolvedValueOnce([{ id: "contact-1" }, { id: "contact-2" }])
      .mockResolvedValueOnce([
        {
          id: "contact-1",
          email: "one@example.com",
          firstName: '<img src=x onerror="alert(1)">',
          lastName: "User",
        },
        { id: "contact-2", email: "two@example.com", firstName: "Two", lastName: "User" },
      ]);
    broadcastCreateMock.mockResolvedValue({
      id: "broadcast-1",
      name: "Spring Update",
      subject: "Subject",
      body: "<p>Hi</p>",
      audienceTag: null,
      audienceIds: ["contact-1", "contact-2"],
      status: "sending",
      sentAt: null,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      createdAt: new Date().toISOString(),
    });
    broadcastUpdateMock.mockResolvedValue({
      id: "broadcast-1",
      name: "Spring Update",
      subject: "Subject",
      body: "<p>Hi</p>",
      audienceTag: null,
      audienceIds: ["contact-1", "contact-2"],
      status: "sent",
      sentAt: new Date().toISOString(),
      sentCount: 2,
      openCount: 0,
      clickCount: 0,
      createdAt: new Date().toISOString(),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Spring Update",
          subject: "Subject {{first_name}}\r\nBcc: victim@example.com",
          body: `<p>Hello {{first_name}}</p><img src="x" onerror="alert('xss')" /><script>alert("xss")</script>`,
          send: true,
        }),
      })
    );

    expect(contactFindManyMock).toHaveBeenNthCalledWith(1, {
      where: { marketingEmailOptOutAt: null },
      select: { id: true },
    });
    expect(contactFindManyMock).toHaveBeenNthCalledWith(2, {
      where: {
        id: { in: ["contact-1", "contact-2"] },
        marketingEmailOptOutAt: null,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const createArgs = broadcastCreateMock.mock.calls[0]?.[0];
    expect(createArgs.data.audienceIds).toEqual(["contact-1", "contact-2"]);
    expect(createArgs.data.body).not.toContain("onerror");
    expect(createArgs.data.body).not.toContain("<script");

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    const firstEmail = sendEmailMock.mock.calls[0]?.[0];
    expect(firstEmail.subject).not.toMatch(/[\r\n]/);
    expect(firstEmail.html).toContain('&lt;img src=x onerror="alert(1)"&gt;');
    expect(firstEmail.html).not.toContain('<img src=x onerror="alert(1)">');
    expect(firstEmail.html).toContain(
      "https://homewisefl.com/unsubscribe?token=signed%2Fcontact%2Fcontact-1",
    );
    expect(firstEmail.html).not.toContain("?id=");
    expect(firstEmail.html).not.toContain("{{unsubscribe_url}}");
    expect(createUnsubscribeTokenMock).toHaveBeenCalledWith(
      { kind: "contact", id: "contact-1" },
      "one@example.com",
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: "broadcast-1",
      status: "sent",
      sentCount: 2,
    });
  });

  it("skips a contact who opts out after broadcast recipient selection", async () => {
    contactFindManyMock
      .mockResolvedValueOnce([{ id: "contact-1" }, { id: "contact-2" }])
      .mockResolvedValueOnce([
        { id: "contact-1", email: "one@example.com", firstName: "One", lastName: "User" },
        { id: "contact-2", email: "two@example.com", firstName: "Two", lastName: "User" },
      ]);
    canSendPreferenceEmailMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    broadcastCreateMock.mockResolvedValue({
      id: "broadcast-1",
      status: "sending",
    });
    broadcastUpdateMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({
      id: "broadcast-1",
      status: "sent",
      ...data,
    }));

    const response = await POST(
      new NextRequest("http://localhost/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Update",
          subject: "Subject",
          body: "<p>Hello</p>",
          send: true,
        }),
      }),
    );

    expect(canSendPreferenceEmailMock).toHaveBeenNthCalledWith(1, {
      kind: "contact",
      id: "contact-1",
      recipientEmail: "one@example.com",
    });
    expect(sendEmailMock).toHaveBeenCalledOnce();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "two@example.com",
    }));
    expect(broadcastUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sentCount: 1 }),
    }));
    expect(response.status).toBe(201);
  });
});
