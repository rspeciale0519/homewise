import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  contactTagFindManyMock,
  contactFindManyMock,
  broadcastCreateMock,
  broadcastUpdateMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  contactTagFindManyMock: vi.fn(),
  contactFindManyMock: vi.fn(),
  broadcastCreateMock: vi.fn(),
  broadcastUpdateMock: vi.fn(),
  sendEmailMock: vi.fn(),
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

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
  personalizeTemplate: (template: string) => template,
  buildEmailHtml: (html: string) => html,
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
  });

  it("sends to all contacts when no explicit audience is provided and sanitizes the stored body", async () => {
    contactFindManyMock
      .mockResolvedValueOnce([{ id: "contact-1" }, { id: "contact-2" }])
      .mockResolvedValueOnce([
        { id: "contact-1", email: "one@example.com", firstName: "One", lastName: "User" },
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
          subject: "Subject",
          body: `<p>Hello</p><img src="x" onerror="alert('xss')" /><script>alert("xss")</script>`,
          send: true,
        }),
      })
    );

    expect(contactFindManyMock).toHaveBeenNthCalledWith(1, {
      select: { id: true },
    });

    const createArgs = broadcastCreateMock.mock.calls[0]?.[0];
    expect(createArgs.data.audienceIds).toEqual(["contact-1", "contact-2"]);
    expect(createArgs.data.body).not.toContain("onerror");
    expect(createArgs.data.body).not.toContain("<script");

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: "broadcast-1",
      status: "sent",
      sentCount: 2,
    });
  });
});
