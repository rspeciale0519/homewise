import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  aggregateMock,
  createMock,
  generateSubjectVariantsMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  aggregateMock: vi.fn(),
  createMock: vi.fn(),
  generateSubjectVariantsMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignEmail: {
      aggregate: aggregateMock,
      create: createMock,
    },
  },
}));

vi.mock("@/lib/email/ab-testing", () => ({
  generateSubjectVariants: generateSubjectVariantsMock,
}));

import { POST } from "./route";

const forbidden = { error: new Response("forbidden", { status: 403 }) };

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/campaigns/campaign-1/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/campaigns/[id]/emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    aggregateMock.mockResolvedValue({ _max: { sortOrder: 0 } });
    createMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "email-1",
      ...data,
    }));
    generateSubjectVariantsMock.mockResolvedValue(undefined);
  });

  it("returns 403 for a non-admin caller", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const res = await POST(request({ subject: "Hi", body: "<p>x</p>" }), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    expect(res.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("sanitizes HTML before storing a campaign email", async () => {
    const res = await POST(
      request({
        subject: "Hello",
        body: '<p>Offer</p><script>steal()</script><a href="javascript:alert(1)">x</a>',
      }),
      { params: Promise.resolve({ id: "campaign-1" }) },
    );

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: "campaign-1",
        subject: "Hello",
      }),
    });
    const stored = createMock.mock.calls[0]?.[0]?.data as { body: string };
    expect(stored.body).toContain("<p>Offer</p>");
    expect(stored.body).not.toContain("<script");
    expect(stored.body).not.toContain("javascript:");
  });
});
