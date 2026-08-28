import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  agentFindUniqueMock,
  lockedAgentFindUniqueMock,
  productConfigFindManyMock,
  queryRawMock,
  subscriptionRetrieveMock,
  subscriptionUpdateMock,
  syncSubscriptionMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  lockedAgentFindUniqueMock: vi.fn(),
  productConfigFindManyMock: vi.fn(),
  queryRawMock: vi.fn(),
  subscriptionRetrieveMock: vi.fn(),
  subscriptionUpdateMock: vi.fn(),
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
    productConfig: { findMany: productConfigFindManyMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: subscriptionRetrieveMock,
      update: subscriptionUpdateMock,
    },
  },
}));

vi.mock("@/lib/billing/stripe-sync", () => ({
  syncSubscriptionFromStripe: syncSubscriptionMock,
}));

import { PUT } from "./route";

const bundle = {
  slug: "ai_power_tools",
  productType: "ai_power_tools",
  isActive: true,
  platforms: ["homewise"],
  monthlyPriceId: "price_bundle_monthly",
  annualPriceId: "price_bundle_annual",
};

const addOn = {
  slug: "extra_ai_credits",
  productType: "add_on",
  isActive: true,
  platforms: ["homewise"],
  monthlyPriceId: "price_addon_monthly",
  annualPriceId: null,
};

const operationId = "11111111-1111-4111-8111-111111111111";

function stripeSubscription(
  items: { id: string; priceId: string }[],
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    items: {
      data: items.map((item) => ({
        id: item.id,
        price: { id: item.priceId },
      })),
    },
    ...overrides,
  };
}

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/billing/subscription/modify", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operationId,
      ...(body as Record<string, unknown>),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue({
    user: { id: "user-1" },
    profile: { email: "agent@example.com" },
  });
  agentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    platform: "homewise",
    stripeCustomer: { stripeCustomerId: "cus_1" },
    subscription: {
      stripeSubscriptionId: "sub_1",
      items: [{
        stripeItemId: "si_bundle",
        stripePriceId: "price_bundle_annual",
      }],
    },
  });
  lockedAgentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    platform: "homewise",
    stripeCustomer: { stripeCustomerId: "cus_1" },
    subscription: { stripeSubscriptionId: "sub_1" },
  });
  productConfigFindManyMock.mockResolvedValue([bundle, addOn]);
  queryRawMock.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
  subscriptionRetrieveMock.mockResolvedValue(stripeSubscription([
    { id: "si_bundle", priceId: "price_bundle_annual" },
  ]));
  subscriptionUpdateMock.mockResolvedValue(stripeSubscription([
    { id: "si_bundle", priceId: "price_bundle_annual" },
  ]));
  syncSubscriptionMock.mockResolvedValue(undefined);
  transactionMock.mockImplementation(async (callback) => callback({
    $queryRaw: queryRawMock,
    agent: { findUnique: lockedAgentFindUniqueMock },
    productConfig: { findMany: productConfigFindManyMock },
  }));
});

describe("PUT /api/billing/subscription/modify", () => {
  it("rejects a new add-on because its benefits are not available", async () => {
    const response = await PUT(request({ addOns: ["extra_ai_credits"] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Add-ons are not available for purchase",
    });
    expect(productConfigFindManyMock).not.toHaveBeenCalled();
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("removes an active add-on by its configured Stripe price", async () => {
    agentFindUniqueMock.mockResolvedValue({
      id: "agent-1",
      platform: "homewise",
      stripeCustomer: { stripeCustomerId: "cus_1" },
      subscription: {
        stripeSubscriptionId: "sub_1",
        items: [{
          stripeItemId: "si_addon",
          stripePriceId: "price_addon_monthly",
        }],
      },
    });
    const currentSubscription = stripeSubscription([
      { id: "si_addon", priceId: "price_addon_monthly" },
    ]);
    const updatedSubscription = stripeSubscription([]);
    subscriptionRetrieveMock
      .mockResolvedValueOnce(currentSubscription)
      .mockResolvedValue(updatedSubscription);
    subscriptionUpdateMock.mockResolvedValue(updatedSubscription);

    const response = await PUT(request({ removeAddOns: ["extra_ai_credits"] }));

    expect(response.status).toBe(200);
    expect(subscriptionUpdateMock).toHaveBeenCalledWith(
      "sub_1",
      {
        items: [{ id: "si_addon", deleted: true }],
        proration_behavior: "always_invoice",
      },
      {
        idempotencyKey:
          `billing-subscription-modify:agent-1:${operationId}`,
      },
    );
    expect(queryRawMock).toHaveBeenCalled();
  });

  it("removes a deactivated add-on that remains on the subscription", async () => {
    agentFindUniqueMock.mockResolvedValue({
      id: "agent-1",
      platform: "homewise",
      stripeCustomer: { stripeCustomerId: "cus_1" },
      subscription: {
        stripeSubscriptionId: "sub_1",
        items: [{
          stripeItemId: "si_addon",
          stripePriceId: "price_addon_monthly",
        }],
      },
    });
    productConfigFindManyMock.mockResolvedValue([
      bundle,
      { ...addOn, isActive: false },
    ]);
    const currentSubscription = stripeSubscription([
      { id: "si_addon", priceId: "price_addon_monthly" },
    ]);
    const updatedSubscription = stripeSubscription([]);
    subscriptionRetrieveMock
      .mockResolvedValueOnce(currentSubscription)
      .mockResolvedValue(updatedSubscription);
    subscriptionUpdateMock.mockResolvedValue(updatedSubscription);

    const response = await PUT(request({ removeAddOns: ["extra_ai_credits"] }));

    expect(response.status).toBe(200);
    expect(subscriptionUpdateMock).toHaveBeenCalledWith(
      "sub_1",
      {
        items: [{ id: "si_addon", deleted: true }],
        proration_behavior: "always_invoice",
      },
      expect.objectContaining({
        idempotencyKey: expect.stringContaining(operationId),
      }),
    );
  });

  it("rejects adding a deactivated bundle", async () => {
    productConfigFindManyMock.mockResolvedValue([
      { ...bundle, isActive: false },
      addOn,
    ]);

    const response = await PUT(request({ addBundles: ["ai_power_tools"] }));

    expect(response.status).toBe(400);
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects removing the final plan", async () => {
    const response = await PUT(request({
      removeBundles: ["ai_power_tools"],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "A subscription must keep at least one plan. Cancel the subscription instead.",
    });
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
    expect(syncSubscriptionMock).not.toHaveBeenCalled();
  });

  it("rejects a bundle submitted through the disabled add-on field", async () => {
    const response = await PUT(request({ addOns: ["ai_power_tools"] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Add-ons are not available for purchase",
    });
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects an entitlement feature key without a matching product", async () => {
    const response = await PUT(request({ addOns: ["ai_cma_reports"] }));

    expect(response.status).toBe(400);
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("does not permit buying an add-on that is already active", async () => {
    agentFindUniqueMock.mockResolvedValue({
      id: "agent-1",
      platform: "homewise",
      stripeCustomer: { stripeCustomerId: "cus_1" },
      subscription: {
        stripeSubscriptionId: "sub_1",
        items: [{
          stripeItemId: "si_addon",
          stripePriceId: "price_addon_monthly",
        }],
      },
    });

    const response = await PUT(request({ addOns: ["extra_ai_credits"] }));

    expect(response.status).toBe(400);
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
    expect(syncSubscriptionMock).not.toHaveBeenCalled();
  });

  it.each(["past_due", "paused", "canceled"])(
    "rejects a live %s subscription",
    async (status) => {
      subscriptionRetrieveMock.mockReset().mockResolvedValue(
        stripeSubscription([
          { id: "si_bundle", priceId: "price_bundle_annual" },
        ], { status }),
      );

      const response = await PUT(request({ addBundles: ["ai_power_tools"] }));

      expect(response.status).toBe(409);
      expect(productConfigFindManyMock).not.toHaveBeenCalled();
      expect(subscriptionUpdateMock).not.toHaveBeenCalled();
      expect(syncSubscriptionMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    { cancel_at_period_end: true, cancel_at: null },
    { cancel_at_period_end: false, cancel_at: 1_800_000_000 },
  ])("rejects changes after cancellation is scheduled", async (cancellation) => {
    subscriptionRetrieveMock.mockReset().mockResolvedValue(
      stripeSubscription([
        { id: "si_bundle", priceId: "price_bundle_annual" },
      ], cancellation),
    );

    const response = await PUT(request({ addBundles: ["ai_power_tools"] }));

    expect(response.status).toBe(409);
    expect(productConfigFindManyMock).not.toHaveBeenCalled();
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
    expect(syncSubscriptionMock).not.toHaveBeenCalled();
  });

  it("rejects a reused operation ID when a newer plan state is live", async () => {
    const emptySubscription = stripeSubscription([]);
    const cachedUpdate = stripeSubscription([
      { id: "si_bundle", priceId: "price_bundle_monthly" },
    ]);
    subscriptionRetrieveMock
      .mockReset()
      .mockResolvedValueOnce(emptySubscription)
      .mockResolvedValueOnce(emptySubscription);
    subscriptionUpdateMock.mockResolvedValueOnce(cachedUpdate);

    const response = await PUT(request({ addBundles: ["ai_power_tools"] }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The subscription change was superseded. Refresh and try again.",
    });
    expect(subscriptionUpdateMock).toHaveBeenCalledOnce();
    expect(syncSubscriptionMock).not.toHaveBeenCalled();
  });

  it("reconciles a retry without adding the same recurring item twice", async () => {
    const updatedSubscription = stripeSubscription([
      { id: "si_bundle", priceId: "price_bundle_monthly" },
    ]);
    subscriptionRetrieveMock
      .mockResolvedValueOnce(stripeSubscription([]))
      .mockResolvedValueOnce(updatedSubscription)
      .mockResolvedValueOnce(updatedSubscription);
    subscriptionUpdateMock.mockResolvedValueOnce(updatedSubscription);
    syncSubscriptionMock
      .mockRejectedValueOnce(new Error("local sync failed"))
      .mockResolvedValueOnce(undefined);

    const firstResponse = await PUT(request({ addBundles: ["ai_power_tools"] }));
    const retryResponse = await PUT(request({ addBundles: ["ai_power_tools"] }));

    expect(firstResponse.status).toBe(500);
    expect(retryResponse.status).toBe(200);
    expect(subscriptionUpdateMock).toHaveBeenCalledTimes(1);
    expect(subscriptionUpdateMock).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({
        items: [{ price: "price_bundle_monthly" }],
      }),
      {
        idempotencyKey:
          `billing-subscription-modify:agent-1:${operationId}`,
      },
    );
    expect(syncSubscriptionMock).toHaveBeenLastCalledWith(
      updatedSubscription,
      expect.any(Object),
    );
  });
});
