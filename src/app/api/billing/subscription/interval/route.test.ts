import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  agentFindUniqueMock,
  productConfigFindManyMock,
  queryRawMock,
  stripeSubscriptionRetrieveMock,
  stripeSubscriptionUpdateMock,
  syncSubscriptionMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  productConfigFindManyMock: vi.fn(),
  queryRawMock: vi.fn(),
  stripeSubscriptionRetrieveMock: vi.fn(),
  stripeSubscriptionUpdateMock: vi.fn(),
  syncSubscriptionMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAuthApi: requireAuthApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: { findUnique: agentFindUniqueMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: stripeSubscriptionRetrieveMock,
      update: stripeSubscriptionUpdateMock,
    },
  },
}));

vi.mock("@/lib/billing/stripe-sync", () => ({
  syncSubscriptionFromStripe: syncSubscriptionMock,
}));

import { PUT } from "./route";

const operationId = "11111111-1111-4111-8111-111111111111";
const transactionClient = {
  $queryRaw: queryRawMock,
  agent: { findUnique: agentFindUniqueMock },
  productConfig: { findMany: productConfigFindManyMock },
};

function stripeSubscription(
  priceId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    items: {
      data: [{ id: "si_1", price: { id: priceId } }],
    },
    ...overrides,
  };
}

function request(body: string): NextRequest {
  return new NextRequest("http://localhost/api/billing/subscription/interval", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue({ user: { id: "user-1" } });
  agentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    platform: "homewise",
    stripeCustomer: { stripeCustomerId: "cus_1" },
    subscription: {
      stripeSubscriptionId: "sub_1",
      items: [{ stripeItemId: "si_1", stripePriceId: "price_monthly" }],
    },
  });
  productConfigFindManyMock.mockResolvedValue([{
    slug: "ai_power_tools",
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
    isActive: true,
    platforms: ["homewise"],
  }]);
  const monthlySubscription = stripeSubscription("price_monthly");
  const annualSubscription = stripeSubscription("price_annual");
  stripeSubscriptionRetrieveMock
    .mockResolvedValueOnce(monthlySubscription)
    .mockResolvedValue(annualSubscription);
  stripeSubscriptionUpdateMock.mockResolvedValue(annualSubscription);
  syncSubscriptionMock.mockResolvedValue(undefined);
  queryRawMock.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
  transactionMock.mockImplementation(
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
});

describe("PUT /api/billing/subscription/interval", () => {
  it("validates the interval and uses platform-scoped product prices", async () => {
    const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

    expect(response.status).toBe(200);
    expect(productConfigFindManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { monthlyPriceId: { in: ["price_monthly"] } },
          { annualPriceId: { in: ["price_monthly"] } },
        ],
      },
    });
    expect(queryRawMock).toHaveBeenCalledOnce();
    expect(stripeSubscriptionUpdateMock).toHaveBeenCalledWith(
      "sub_1",
      {
        items: [{ id: "si_1", price: "price_annual" }],
        proration_behavior: "always_invoice",
      },
      {
        idempotencyKey: `billing-subscription-interval:agent-1:${operationId}`,
      },
    );
    expect(syncSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sub_1",
        items: { data: [expect.objectContaining({ price: { id: "price_annual" } })] },
      }),
      transactionClient,
    );
  });

  it.each(["past_due", "paused", "canceled"])(
    "rejects a live %s subscription",
    async (status) => {
      stripeSubscriptionRetrieveMock.mockReset().mockResolvedValue(
        stripeSubscription("price_monthly", { status }),
      );

      const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

      expect(response.status).toBe(409);
      expect(productConfigFindManyMock).not.toHaveBeenCalled();
      expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
      expect(syncSubscriptionMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    { cancel_at_period_end: true, cancel_at: null },
    { cancel_at_period_end: false, cancel_at: 1_800_000_000 },
  ])("rejects a subscription with cancellation already scheduled", async (cancellation) => {
    stripeSubscriptionRetrieveMock.mockReset().mockResolvedValue(
      stripeSubscription("price_monthly", cancellation),
    );

    const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

    expect(response.status).toBe(409);
    expect(productConfigFindManyMock).not.toHaveBeenCalled();
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
    expect(syncSubscriptionMock).not.toHaveBeenCalled();
  });

  it("reconciles a retry that is already on the requested interval", async () => {
    const annualSubscription = stripeSubscription("price_annual");
    stripeSubscriptionRetrieveMock.mockReset().mockResolvedValue(annualSubscription);

    const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Subscription already on the requested interval",
    });
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
    expect(syncSubscriptionMock).toHaveBeenCalledWith(
      annualSubscription,
      transactionClient,
    );
  });

  it("rejects a reused operation ID when a newer interval is live", async () => {
    const monthlySubscription = stripeSubscription("price_monthly");
    const cachedAnnualResponse = stripeSubscription("price_annual");
    stripeSubscriptionRetrieveMock
      .mockReset()
      .mockResolvedValueOnce(monthlySubscription)
      .mockResolvedValueOnce(monthlySubscription);
    stripeSubscriptionUpdateMock.mockResolvedValueOnce(cachedAnnualResponse);

    const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The billing interval request was superseded. Refresh and try again.",
    });
    expect(stripeSubscriptionUpdateMock).toHaveBeenCalledOnce();
    expect(syncSubscriptionMock).not.toHaveBeenCalled();
  });

  it("rejects unknown request fields", async () => {
    const response = await PUT(request(JSON.stringify({
      interval: "annual",
      operationId,
      stripeSubscriptionId: "sub_other",
    })));

    expect(response.status).toBe(400);
    expect(productConfigFindManyMock).not.toHaveBeenCalled();
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects bodies larger than the byte limit", async () => {
    const response = await PUT(request(JSON.stringify({
      interval: "annual",
      operationId,
      padding: "x".repeat(1_100),
    })));

    expect(response.status).toBe(413);
    expect(productConfigFindManyMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown subscription price", async () => {
    productConfigFindManyMock.mockResolvedValueOnce([]);

    const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Subscription contains an unknown product price",
    });
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects an inactive subscription product", async () => {
    productConfigFindManyMock.mockResolvedValueOnce([{
      slug: "ai_power_tools",
      monthlyPriceId: "price_monthly",
      annualPriceId: "price_annual",
      isActive: false,
      platforms: ["homewise"],
    }]);

    const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Subscription contains an inactive product: ai_power_tools",
    });
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects a product from another platform", async () => {
    productConfigFindManyMock.mockResolvedValueOnce([{
      slug: "riusa_annual_dues",
      monthlyPriceId: "price_monthly",
      annualPriceId: "price_annual",
      isActive: true,
      platforms: ["riusa"],
    }]);

    const response = await PUT(request(JSON.stringify({ operationId, interval: "annual" })));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Subscription product is not available on this platform: riusa_annual_dues",
    });
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
  });
});
