// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  listingFind: vi.fn(),
  comparableFind: vi.fn(),
  reserve: vi.fn(),
  complete: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireStaffApi: mocks.requireStaff,
  isError: (value: object) => "error" in value,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findFirst: mocks.listingFind, findMany: mocks.comparableFind },
  },
}));
vi.mock("@/lib/billing/require-feature", () => ({
  reserveStaffFeature: mocks.reserve,
}));
vi.mock("@/lib/ai", () => ({ aiCompleteForFeature: mocks.complete }));
vi.mock("@/lib/mls-visibility", () => ({ withIdx: (where: unknown) => where }));

import * as route from "./route";

function request(body: string): NextRequest {
  return new NextRequest("http://localhost/api/ai/listing-insights", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/ai/listing-insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "agent" },
      isAdmin: false,
      agentId: "agent-1",
    });
    mocks.listingFind.mockResolvedValue({
      id: "listing-1",
      mlsId: "MLS-1",
      address: "1 Main St",
      city: "Orlando",
      price: 500_000,
      daysOnMarket: 10,
      beds: 3,
      baths: 2,
      sqft: 1_800,
      propertyType: "Single Family",
    });
    mocks.comparableFind.mockResolvedValue([]);
    mocks.reserve.mockResolvedValue(null);
    mocks.complete.mockResolvedValue({
      content: '{"performanceSummary":"Good"}',
      inputTokens: 1,
      outputTokens: 1,
      cached: false,
    });
  });

  it("exposes only POST for the paid operation", () => {
    expect("GET" in route).toBe(false);
  });

  it("rejects oversized input before model use", async () => {
    const response = await route.POST(request(JSON.stringify({
      mlsId: "x".repeat(2_100),
    })));

    expect(response.status).toBe(413);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("reserves paid feature access before model use", async () => {
    const response = await route.POST(request(JSON.stringify({ mlsId: "MLS-1" })));

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
