import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  evaluationFind: vi.fn(),
  contactFind: vi.fn(),
  listingFind: vi.fn(),
  complete: vi.fn(),
  analyticsBoEnabled: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireStaffApi: mocks.requireStaff,
  isError: (value: object) => "error" in value,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    homeEvaluation: { findUnique: mocks.evaluationFind },
    contact: { findFirst: mocks.contactFind },
    listing: { findMany: mocks.listingFind },
  },
}));

vi.mock("@/lib/ai", () => ({ aiCompleteForFeature: mocks.complete }));
vi.mock("@/lib/analytics-flags", () => ({
  analyticsBoEnabled: mocks.analyticsBoEnabled,
  analyticsUnavailable: () => ({ error: "unavailable" }),
  withBo: (where: unknown) => where,
}));

import { POST } from "./route";

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/home-valuation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/home-valuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({
      user: { id: "user-a" },
      profile: { role: "agent" },
      isAdmin: false,
      agentId: "agent-a",
    });
    mocks.evaluationFind.mockResolvedValue({
      id: "eval-1",
      email: "victim@example.com",
      streetAddress: "1 Secret Ln",
      city: "Orlando",
      state: "FL",
      zip: "32801",
    });
    mocks.contactFind.mockResolvedValue(null);
    mocks.listingFind.mockResolvedValue([]);
    mocks.analyticsBoEnabled.mockReturnValue(true);
    mocks.complete.mockResolvedValue({
      content: "narrative",
      inputTokens: 1,
      outputTokens: 1,
      cached: false,
    });
  });

  it("returns 403 for a non-staff caller", async () => {
    mocks.requireStaff.mockResolvedValue({
      error: new Response("forbidden", { status: 403 }),
    });

    const res = await POST(request({ evaluationId: "eval-1" }));
    expect(res.status).toBe(403);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("does not let agent A generate a narrative for an evaluation whose email they do not own", async () => {
    const res = await POST(request({ evaluationId: "eval-1" }));
    expect(res.status).toBe(404);
    expect(mocks.contactFind).toHaveBeenCalledWith({
      where: {
        email: "victim@example.com",
        assignedAgentId: "agent-a",
      },
      select: { id: true },
    });
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
