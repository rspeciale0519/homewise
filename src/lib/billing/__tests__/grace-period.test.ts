import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: vi.fn() },
    gracePeriodOverride: { findFirst: vi.fn() },
    billingSettings: { findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getGraceStatus } from "../grace-period";

const mockSubscription = prisma.subscription as {
  findUnique: ReturnType<typeof vi.fn>;
};
const mockGracePeriodOverride = prisma.gracePeriodOverride as {
  findFirst: ReturnType<typeof vi.fn>;
};
const mockBillingSettings = prisma.billingSettings as {
  findFirst: ReturnType<typeof vi.fn>;
};

// Fixed "now" date for all tests
const NOW = new Date("2026-03-28T12:00:00.000Z");

function daysBeforeNow(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function daysAfterNow(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
}

// Default billing settings (match grace-period.ts defaults)
const DEFAULT_SETTINGS = {
  gracePeriodWarningDays: 7,
  gracePeriodUrgentDays: 14,
  gracePeriodLockoutDays: 15,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // Default: no override, default settings
  mockGracePeriodOverride.findFirst.mockResolvedValue(null);
  mockBillingSettings.findFirst.mockResolvedValue(DEFAULT_SETTINGS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getGraceStatus", () => {
  it("returns current when there is no subscription", async () => {
    mockSubscription.findUnique.mockResolvedValue(null);

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "current" });
    expect(mockGracePeriodOverride.findFirst).not.toHaveBeenCalled();
  });

  it("returns current when subscription exists but is active (not past_due)", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "active",
      currentPeriodEnd: daysBeforeNow(5),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "current" });
    expect(mockGracePeriodOverride.findFirst).not.toHaveBeenCalled();
  });

  it("returns current when subscription is trialing", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "trialing",
      currentPeriodEnd: daysAfterNow(7),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "current" });
  });

  it("returns warning when past_due and 3 days overdue (under warning threshold of 7)", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(3),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "warning", daysOverdue: 3 });
  });

  it("returns urgent when past_due and 10 days overdue (between warning threshold 7 and urgent threshold 14)", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(10),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "urgent", daysOverdue: 10 });
  });

  it("returns locked_bundles when past_due and 14 days overdue (at urgent threshold)", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(14),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "locked_bundles", daysOverdue: 14 });
  });

  it("returns locked_all when past_due and 20 days overdue (past lockout threshold of 15)", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(20),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "locked_all", daysOverdue: 20 });
  });

  it("returns current when past_due but an active admin override exists", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(10),
    });

    mockGracePeriodOverride.findFirst.mockResolvedValue({
      agentId: "agent-1",
      extendedUntil: daysAfterNow(5),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "current" });
  });

  it("returns non-current status when past_due and override is expired", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(10),
    });

    // findFirst returns null when override is expired (the query filters extendedUntil >= now)
    mockGracePeriodOverride.findFirst.mockResolvedValue(null);

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "urgent", daysOverdue: 10 });
  });

  it("returns locked_all at exactly the lockout threshold (15 days)", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(15),
    });

    const result = await getGraceStatus("agent-1");

    expect(result).toEqual({ status: "locked_all", daysOverdue: 15 });
  });

  it("respects custom billing settings when provided", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(5),
    });

    mockBillingSettings.findFirst.mockResolvedValue({
      gracePeriodWarningDays: 3,
      gracePeriodUrgentDays: 7,
      gracePeriodLockoutDays: 10,
    });

    const result = await getGraceStatus("agent-1");

    // With custom settings: 5 days overdue >= 3 (warning) and >= 3 but < 7 → urgent
    expect(result).toEqual({ status: "urgent", daysOverdue: 5 });
  });

  it("uses default billing settings when billingSettings record is null", async () => {
    mockSubscription.findUnique.mockResolvedValue({
      agentId: "agent-1",
      status: "past_due",
      currentPeriodEnd: daysBeforeNow(3),
    });

    mockBillingSettings.findFirst.mockResolvedValue(null);

    const result = await getGraceStatus("agent-1");

    // Default warning threshold is 7, so 3 days overdue → warning
    expect(result).toEqual({ status: "warning", daysOverdue: 3 });
  });
});
