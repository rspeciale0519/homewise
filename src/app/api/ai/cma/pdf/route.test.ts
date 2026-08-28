import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CmaReportProps } from "@/components/pdf/cma-report-document";

const {
  requireStaffApiMock,
  checkFeatureAccessMock,
  renderToBufferMock,
  logApiErrorMock,
} = vi.hoisted(() => ({
  requireStaffApiMock: vi.fn(),
  checkFeatureAccessMock: vi.fn(),
  renderToBufferMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireStaffApi: requireStaffApiMock,
  isError: (result: unknown) => (
    typeof result === "object" && result !== null && "error" in result
  ),
}));

vi.mock("@/lib/billing/check-feature", () => ({
  checkFeatureAccess: checkFeatureAccessMock,
}));

vi.mock("@/lib/api-error", () => ({
  logApiError: logApiErrorMock,
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: renderToBufferMock,
}));

vi.mock("@/components/pdf/cma-report-document", () => ({
  CmaReportDocument: () => null,
}));

import { MAX_CMA_PDF_BODY_BYTES, POST } from "./route";

const validBody = {
  estimatedValue: { low: 450_000, mid: 475_000, high: 500_000 },
  pricingRecommendation: "List near the middle of the range.",
  marketNarrative: "Comparable sales support this price range.",
  keyFindings: ["Inventory remains limited."],
  comps: [
    {
      address: "125 Oak Ave",
      city: "Orlando",
      soldPrice: 470_000,
      beds: 3,
      baths: 2,
      sqft: 1_800,
      dom: 21,
      closeDate: "2026-08-01T00:00:00.000Z",
    },
  ],
  activeComps: [
    {
      address: "130 Oak Ave",
      price: 490_000,
      beds: 3,
      baths: 2,
      sqft: 1_850,
      dom: 12,
    },
  ],
  subjectProperty: {
    address: "123 Oak Ave",
    city: "Orlando",
    zip: "32801",
    beds: 3,
    baths: 2,
    sqft: 1_820,
    propertyType: "Single Family",
  },
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/cma/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireStaffApiMock.mockResolvedValue({
    user: { id: "user-1" },
    profile: {
      id: "user-1",
      firstName: "Avery",
      lastName: "Agent",
      email: "avery@example.com",
      phone: "+14075550123",
      role: "agent",
    },
    isAdmin: false,
    agentId: "agent-1",
  });
  checkFeatureAccessMock.mockResolvedValue({
    allowed: true,
    remaining: 2,
    limit: 3,
    upgradeBundle: null,
  });
  renderToBufferMock.mockResolvedValue(Buffer.from("%PDF-test"));
});

describe("POST /api/ai/cma/pdf", () => {
  it("checks agent access without reserving another use and overrides identity", async () => {
    const response = await POST(request({
      ...validBody,
      agentName: "Forged Agent",
      agentEmail: "forged@example.com",
      agentPhone: "+19995550123",
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(checkFeatureAccessMock).toHaveBeenCalledOnce();
    expect(checkFeatureAccessMock).toHaveBeenCalledWith("agent-1", "ai_cma_reports");

    const element = renderToBufferMock.mock.calls[0]?.[0] as {
      props: CmaReportProps;
    };
    expect(element.props).toMatchObject({
      agentName: "Avery Agent",
      agentEmail: "avery@example.com",
      agentPhone: "+14075550123",
      activeComps: validBody.activeComps,
    });
  });

  it("does not check entitlements for an administrator", async () => {
    requireStaffApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: {
        id: "admin-1",
        firstName: "Ada",
        lastName: "Admin",
        email: "ada@example.com",
        phone: null,
        role: "admin",
      },
      isAdmin: true,
      agentId: null,
    });

    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    expect(checkFeatureAccessMock).not.toHaveBeenCalled();
  });

  it("denies an agent without feature access", async () => {
    checkFeatureAccessMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 0,
      upgradeBundle: "agent-growth",
    });

    const response = await POST(request(validBody));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "This feature is not available with the current subscription.",
      upgradeBundle: "agent-growth",
    });
    expect(renderToBufferMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...validBody, unexpected: "value" }],
    [{ ...validBody, estimatedValue: { low: 500_000, mid: 475_000, high: 450_000 } }],
    [{ ...validBody, keyFindings: Array.from({ length: 21 }, () => "Finding") }],
  ])("rejects an invalid or unbounded report payload", async (body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Validation failed" });
    expect(renderToBufferMock).not.toHaveBeenCalled();
  });

  it("rejects a streamed body above the byte limit", async () => {
    const oversized = request({
      ...validBody,
      marketNarrative: "x".repeat(MAX_CMA_PDF_BODY_BYTES),
    });
    expect(oversized.headers.get("content-length")).toBeNull();

    const response = await POST(oversized);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Request body is too large" });
    expect(renderToBufferMock).not.toHaveBeenCalled();
  });

  it("returns a safe error when PDF rendering fails", async () => {
    renderToBufferMock.mockRejectedValue(new Error("private renderer detail"));

    const response = await POST(request(validBody));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to generate CMA PDF" });
    expect(logApiErrorMock).toHaveBeenCalledWith(
      "ai/cma/pdf/render",
      expect.any(Error),
    );
  });
});
