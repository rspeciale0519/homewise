import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkEntitlementMock, incrementUsageMock, transactionMock } = vi.hoisted(() => ({
  checkEntitlementMock: vi.fn(),
  incrementUsageMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/billing/entitlements", () => ({
  checkEntitlement: checkEntitlementMock,
  incrementUsage: incrementUsageMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

import { reserveFeatureUsage } from "./check-feature";

describe("reserveFeatureUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(
      async (callback: (tx: object) => Promise<unknown>) => callback({ transaction: true }),
    );
  });

  it("checks and reserves usage in one serializable transaction", async () => {
    checkEntitlementMock.mockResolvedValue({
      allowed: true,
      remaining: 1,
      limit: 5,
      upgradeBundle: null,
    });
    incrementUsageMock.mockResolvedValue(undefined);

    await expect(reserveFeatureUsage("agent-1", "ai_cma_reports")).resolves.toMatchObject({
      allowed: true,
    });

    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(incrementUsageMock).toHaveBeenCalledWith(
      "agent-1",
      "ai_cma_reports",
      { transaction: true },
    );
    expect(checkEntitlementMock).toHaveBeenCalledWith(
      "agent-1",
      "ai_cma_reports",
      { transaction: true },
      { requireActiveConfig: true },
    );
  });

  it("does not increment a denied feature", async () => {
    checkEntitlementMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 5,
      upgradeBundle: "ai-tools",
    });

    await expect(reserveFeatureUsage("agent-1", "ai_cma_reports")).resolves.toMatchObject({
      allowed: false,
    });
    expect(incrementUsageMock).not.toHaveBeenCalled();
  });

  it("retries a serializable write conflict", async () => {
    transactionMock
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementationOnce(
        async (callback: (tx: object) => Promise<unknown>) => callback({ transaction: true }),
      );
    checkEntitlementMock.mockResolvedValue({
      allowed: true,
      remaining: 1,
      limit: 5,
      upgradeBundle: null,
    });

    await reserveFeatureUsage("agent-1", "ai_cma_reports");

    expect(transactionMock).toHaveBeenCalledTimes(2);
  });
});
