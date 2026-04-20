import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: { findUnique: vi.fn() },
    entitlementConfig: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    bundleFeature: { findFirst: vi.fn() },
    usageRecord: { findUnique: vi.fn(), upsert: vi.fn() },
    bundleConfig: { findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { checkEntitlement } from "../entitlements";

const mockAgent = prisma.agent as {
  findUnique: ReturnType<typeof vi.fn>;
};
const mockEntitlementConfig = prisma.entitlementConfig as {
  findUnique: ReturnType<typeof vi.fn>;
};
const mockSubscription = prisma.subscription as {
  findUnique: ReturnType<typeof vi.fn>;
};
const mockBundleFeature = prisma.bundleFeature as {
  findFirst: ReturnType<typeof vi.fn>;
};
const mockUsageRecord = prisma.usageRecord as {
  findUnique: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};
const mockBundleConfig = prisma.bundleConfig as {
  findFirst: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkEntitlement", () => {
  it("returns allowed when feature is not configured in EntitlementConfig", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue(null);

    const result = await checkEntitlement("agent-1", "some_feature");

    expect(result).toEqual({
      allowed: true,
      remaining: null,
      limit: null,
      upgradeBundle: null,
    });
    expect(mockSubscription.findUnique).not.toHaveBeenCalled();
  });

  it("returns allowed when feature config exists but has no requiredProduct (free for all)", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "free_feature",
      isActive: true,
      requiredProduct: null,
      freeLimit: null,
    });

    const result = await checkEntitlement("agent-1", "free_feature");

    expect(result).toEqual({
      allowed: true,
      remaining: null,
      limit: null,
      upgradeBundle: null,
    });
    expect(mockSubscription.findUnique).not.toHaveBeenCalled();
  });

  it("returns allowed when feature config is inactive", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "some_feature",
      isActive: false,
      requiredProduct: "pro",
      freeLimit: null,
    });

    const result = await checkEntitlement("agent-1", "some_feature");

    expect(result).toEqual({
      allowed: true,
      remaining: null,
      limit: null,
      upgradeBundle: null,
    });
  });

  it("returns allowed with unlimited access when agent has the required bundle (active subscription, no limit on bundleFeature)", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "pro_feature",
      isActive: true,
      requiredProduct: "pro",
      freeLimit: null,
      platforms: ["homewise"],
    });

    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "active",
      currentPeriodStart: new Date("2026-03-01"),
      currentPeriodEnd: new Date("2026-04-01"),
      items: [{ productType: "pro" }],
    });

    mockBundleFeature.findFirst.mockResolvedValue({
      featureKey: "pro_feature",
      limit: null,
    });

    const result = await checkEntitlement("agent-1", "pro_feature");

    expect(result).toEqual({
      allowed: true,
      remaining: null,
      limit: null,
      upgradeBundle: null,
    });
  });

  it("returns allowed with remaining count when agent has bundle with a usage limit and is under it", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "pro_feature",
      isActive: true,
      requiredProduct: "pro",
      freeLimit: null,
      platforms: ["homewise"],
    });

    const periodStart = new Date("2026-03-01");
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "active",
      currentPeriodStart: periodStart,
      currentPeriodEnd: new Date("2026-04-01"),
      items: [{ productType: "pro" }],
    });

    mockBundleFeature.findFirst.mockResolvedValue({
      featureKey: "pro_feature",
      limit: 10,
    });

    mockUsageRecord.findUnique.mockResolvedValue({ usageCount: 3 });

    const result = await checkEntitlement("agent-1", "pro_feature");

    expect(result).toEqual({
      allowed: true,
      remaining: 7,
      limit: 10,
      upgradeBundle: null,
    });
  });

  it("returns not allowed when agent has bundle but has used all of the limit", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "pro_feature",
      isActive: true,
      requiredProduct: "pro",
      freeLimit: null,
      platforms: ["homewise"],
    });

    const periodStart = new Date("2026-03-01");
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "active",
      currentPeriodStart: periodStart,
      currentPeriodEnd: new Date("2026-04-01"),
      items: [{ productType: "pro" }],
    });

    mockBundleFeature.findFirst.mockResolvedValue({
      featureKey: "pro_feature",
      limit: 10,
    });

    mockUsageRecord.findUnique.mockResolvedValue({ usageCount: 10 });

    const result = await checkEntitlement("agent-1", "pro_feature");

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      limit: 10,
      upgradeBundle: null,
    });
  });

  it("returns allowed with remaining count when agent has no bundle but is under free limit", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "gated_feature",
      isActive: true,
      requiredProduct: "pro",
      freeLimit: 5,
      platforms: ["homewise"],
    });

    mockSubscription.findUnique.mockResolvedValue(null);

    mockUsageRecord.findUnique.mockResolvedValue({ usageCount: 2 });

    mockBundleConfig.findFirst.mockResolvedValue({ slug: "pro-bundle" });

    const result = await checkEntitlement("agent-1", "gated_feature");

    expect(result).toEqual({
      allowed: true,
      remaining: 3,
      limit: 5,
      upgradeBundle: null,
    });
    expect(mockBundleConfig.findFirst).not.toHaveBeenCalled();
  });

  it("returns not allowed with upgradeBundle slug when agent has no bundle and is at/over free limit", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "gated_feature",
      isActive: true,
      requiredProduct: "pro",
      freeLimit: 5,
      platforms: ["homewise"],
    });

    mockSubscription.findUnique.mockResolvedValue(null);

    mockUsageRecord.findUnique.mockResolvedValue({ usageCount: 5 });

    mockBundleConfig.findFirst.mockResolvedValue({ slug: "pro-bundle" });

    const result = await checkEntitlement("agent-1", "gated_feature");

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      limit: 5,
      upgradeBundle: "pro-bundle",
    });
  });

  it("returns not allowed when agent has no subscription and feature has no free access", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "premium_feature",
      isActive: true,
      requiredProduct: "enterprise",
      freeLimit: null,
      platforms: ["homewise"],
    });

    mockSubscription.findUnique.mockResolvedValue(null);

    mockBundleConfig.findFirst.mockResolvedValue({ slug: "enterprise-bundle" });

    const result = await checkEntitlement("agent-1", "premium_feature");

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      limit: null,
      upgradeBundle: "enterprise-bundle",
    });
  });

  it("returns current status when agent has trialing subscription with required product", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "pro_feature",
      isActive: true,
      requiredProduct: "pro",
      freeLimit: null,
      platforms: ["homewise"],
    });

    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "trialing",
      currentPeriodStart: new Date("2026-03-01"),
      currentPeriodEnd: new Date("2026-04-01"),
      items: [{ productType: "pro" }],
    });

    mockBundleFeature.findFirst.mockResolvedValue({
      featureKey: "pro_feature",
      limit: null,
    });

    const result = await checkEntitlement("agent-1", "pro_feature");

    expect(result).toEqual({
      allowed: true,
      remaining: null,
      limit: null,
      upgradeBundle: null,
    });
  });

  it("does not treat past_due subscription as having the required product", async () => {
    mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
    mockEntitlementConfig.findUnique.mockResolvedValue({
      featureKey: "pro_feature",
      isActive: true,
      requiredProduct: "pro",
      freeLimit: 3,
      platforms: ["homewise"],
    });

    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodStart: new Date("2026-03-01"),
      currentPeriodEnd: new Date("2026-04-01"),
      items: [{ productType: "pro" }],
    });

    mockUsageRecord.findUnique.mockResolvedValue({ usageCount: 1 });
    mockBundleConfig.findFirst.mockResolvedValue({ slug: "pro-bundle" });

    const result = await checkEntitlement("agent-1", "pro_feature");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(mockBundleFeature.findFirst).not.toHaveBeenCalled();
  });

  describe("platform gating", () => {
    it("denies a RIUSA agent access to an entitlement tagged homewise-only", async () => {
      mockAgent.findUnique.mockResolvedValue({ platform: "riusa" });
      mockEntitlementConfig.findUnique.mockResolvedValue({
        featureKey: "ai_cma_reports",
        isActive: true,
        requiredProduct: "ai_power_tools",
        freeLimit: null,
        platforms: ["homewise"],
      });

      const result = await checkEntitlement("agent-riusa", "ai_cma_reports");

      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        limit: null,
        upgradeBundle: null,
      });
    });

    it("allows a HW agent access to a homewise-tagged entitlement (with active product)", async () => {
      mockAgent.findUnique.mockResolvedValue({ platform: "homewise" });
      mockEntitlementConfig.findUnique.mockResolvedValue({
        featureKey: "ai_cma_reports",
        isActive: true,
        requiredProduct: "ai_power_tools",
        freeLimit: null,
        platforms: ["homewise"],
      });
      mockSubscription.findUnique.mockResolvedValue({
        status: "active",
        currentPeriodStart: new Date("2026-04-01"),
        items: [{ productType: "ai_power_tools" }],
      });
      mockBundleFeature.findFirst.mockResolvedValue({ limit: null });

      const result = await checkEntitlement("agent-hw", "ai_cma_reports");

      expect(result.allowed).toBe(true);
    });

    it("allows any agent when the entitlement is dual-platform", async () => {
      mockAgent.findUnique.mockResolvedValue({ platform: "riusa" });
      mockEntitlementConfig.findUnique.mockResolvedValue({
        featureKey: "ai_cma_reports",
        isActive: true,
        requiredProduct: "ai_power_tools",
        freeLimit: null,
        platforms: ["homewise", "riusa"],
      });
      mockSubscription.findUnique.mockResolvedValue({
        status: "active",
        currentPeriodStart: new Date("2026-04-01"),
        items: [{ productType: "ai_power_tools" }],
      });
      mockBundleFeature.findFirst.mockResolvedValue({ limit: null });

      const result = await checkEntitlement("agent-riusa", "ai_cma_reports");

      expect(result.allowed).toBe(true);
    });

    it("defaults unknown agent platform to homewise", async () => {
      mockAgent.findUnique.mockResolvedValue(null);
      mockEntitlementConfig.findUnique.mockResolvedValue({
        featureKey: "ai_cma_reports",
        isActive: true,
        requiredProduct: "ai_power_tools",
        freeLimit: null,
        platforms: ["homewise"],
      });
      mockSubscription.findUnique.mockResolvedValue(null);
      mockBundleConfig.findFirst.mockResolvedValue({ slug: "ai_power_tools" });

      const result = await checkEntitlement("unknown-agent", "ai_cma_reports");

      expect(result.allowed).toBe(false);
      expect(result.upgradeBundle).toBe("ai_power_tools");
    });
  });
});
