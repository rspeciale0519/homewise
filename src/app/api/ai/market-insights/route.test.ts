// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  reserve: vi.fn(),
  complete: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireStaffApi: mocks.requireStaff,
  isError: (value: object) => "error" in value,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { listing: { count: mocks.count, aggregate: mocks.aggregate } },
}));
vi.mock("@/lib/billing/require-feature", () => ({
  reserveStaffFeature: mocks.reserve,
}));
vi.mock("@/lib/ai", () => ({ aiCompleteForFeature: mocks.complete }));
vi.mock("@/lib/analytics-flags", () => ({
  analyticsBoEnabled: () => true,
  analyticsUnavailable: vi.fn(),
  withBo: (where: unknown) => where,
}));

import * as route from "./route";

function request(body: string): NextRequest {
  return new NextRequest("http://localhost/api/ai/market-insights", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/ai/market-insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "agent" },
      isAdmin: false,
      agentId: "agent-1",
    });
    mocks.count.mockResolvedValue(2);
    mocks.aggregate
      .mockResolvedValueOnce({ _avg: { price: 500_000 } })
      .mockResolvedValueOnce({ _avg: { daysOnMarket: 20 } });
    mocks.reserve.mockResolvedValue(null);
    mocks.complete.mockResolvedValue({
      content: "Market insight",
      inputTokens: 1,
      outputTokens: 1,
      cached: false,
    });
  });

  it("exposes only POST for the paid operation", () => {
    expect("GET" in route).toBe(false);
  });

  it("reserves paid feature access before model use", async () => {
    const response = await route.POST(request(JSON.stringify({ city: "Orlando" })));

    expect(response.status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: "agent-1" }),
      "ai_listing_descriptions",
    );
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.complete.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });
});
