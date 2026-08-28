import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  agentFindUniqueMock,
  productConfigFindManyMock,
  transactionMock,
  queryRawMock,
  subscriptionFindUniqueMock,
  getOrCreateCustomerMock,
  checkoutListMock,
  checkoutCreateMock,
  stripeSubscriptionListMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  productConfigFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  queryRawMock: vi.fn(),
  subscriptionFindUniqueMock: vi.fn(),
  getOrCreateCustomerMock: vi.fn(),
  checkoutListMock: vi.fn(),
  checkoutCreateMock: vi.fn(),
  stripeSubscriptionListMock: vi.fn(),
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

vi.mock("@/lib/billing/stripe-sync", () => ({
  getOrCreateStripeCustomer: getOrCreateCustomerMock,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        list: checkoutListMock,
        create: checkoutCreateMock,
      },
    },
    subscriptions: { list: stripeSubscriptionListMock },
  },
}));

import { POST } from "./route";

const operationId = "123e4567-e89b-42d3-a456-426614174000";

const bundle = {
  slug: "ai_power_tools",
  productType: "ai_power_tools",
  monthlyPriceId: "price_bundle_monthly",
  annualPriceId: "price_bundle_annual",
};

const addOn = {
  slug: "extra_ai_credits",
  productType: "add_on",
  monthlyPriceId: "price_addon_monthly",
  annualPriceId: null,
};

const monthlyOnlyBundle = {
  slug: "social_media_management",
  productType: "social_media_management",
  monthlyPriceId: "price_social_monthly",
  annualPriceId: null,
};

type TransactionClientMock = {
  $queryRaw: typeof queryRawMock;
  subscription: { findUnique: typeof subscriptionFindUniqueMock };
};

type TransactionCallback = (tx: TransactionClientMock) => Promise<unknown>;

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
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
    subscription: null,
  });
  productConfigFindManyMock.mockResolvedValue([bundle]);
  queryRawMock.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
  subscriptionFindUniqueMock.mockResolvedValue(null);
  transactionMock.mockImplementation(async (callback: TransactionCallback) => callback({
    $queryRaw: queryRawMock,
    subscription: { findUnique: subscriptionFindUniqueMock },
  }));
  getOrCreateCustomerMock.mockResolvedValue("cus_1");
  checkoutListMock.mockResolvedValue({ data: [], has_more: false });
  stripeSubscriptionListMock.mockResolvedValue({ data: [], has_more: false });
  checkoutCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session" });
});

describe("POST /api/billing/checkout", () => {
  it("serializes checkout and reconciles Stripe before creating a bundle session", async () => {
    const response = await POST(request({
      operationId,
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.com/session",
    });
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 30_000 });
    expect(queryRawMock).toHaveBeenCalledOnce();
    const [queryParts, lockKey] = queryRawMock.mock.calls[0] as [
      TemplateStringsArray,
      string,
    ];
    expect(queryParts.join("?")).toContain("pg_advisory_xact_lock");
    expect(lockKey).toBe("billing-checkout:agent-1");
    expect(subscriptionFindUniqueMock).toHaveBeenCalledWith({
      where: { agentId: "agent-1" },
      select: { status: true },
    });
    expect(checkoutListMock).toHaveBeenCalledWith({
      customer: "cus_1",
      status: "open",
      limit: 100,
    });
    expect(stripeSubscriptionListMock).toHaveBeenCalledWith({
      customer: "cus_1",
      status: "all",
      limit: 100,
    });
    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        line_items: [{ price: "price_bundle_annual", quantity: 1 }],
        metadata: { agentId: "agent-1", operationId },
      }),
      { idempotencyKey: `billing-checkout:agent-1:${operationId}` },
    );
  });

  it("rejects add-on sales until their benefits are enforced", async () => {
    productConfigFindManyMock.mockResolvedValue([addOn]);

    const response = await POST(request({
      operationId,
      bundles: [],
      addOns: ["extra_ai_credits"],
      billingInterval: "monthly",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Add-ons are not available for checkout yet.",
    });
    expect(productConfigFindManyMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("rejects products that would mix annual and monthly prices", async () => {
    productConfigFindManyMock.mockResolvedValue([bundle, monthlyOnlyBundle]);

    const response = await POST(request({
      operationId,
      bundles: ["ai_power_tools", "social_media_management"],
      addOns: [],
      billingInterval: "annual",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The social_media_management product does not support annual billing.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it.each(["active", "trialing", "past_due", "unpaid", "paused", "incomplete"])(
    "rejects a second checkout for a %s subscription",
    async (status) => {
      agentFindUniqueMock.mockResolvedValue({
        id: "agent-1",
        platform: "homewise",
        subscription: { status },
      });

      const response = await POST(request({
        operationId,
        bundles: ["ai_power_tools"],
        addOns: [],
      }));

      expect(response.status).toBe(409);
      expect(productConfigFindManyMock).not.toHaveBeenCalled();
      expect(getOrCreateCustomerMock).not.toHaveBeenCalled();
      expect(checkoutCreateMock).not.toHaveBeenCalled();
    },
  );

  it("blocks a subscription that appears after the initial agent query", async () => {
    subscriptionFindUniqueMock.mockResolvedValue({ status: "active" });

    const response = await POST(request({
      operationId,
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    }));

    expect(response.status).toBe(409);
    expect(queryRawMock).toHaveBeenCalledOnce();
    expect(getOrCreateCustomerMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it.each(["active", "trialing", "past_due", "unpaid", "paused", "incomplete"])(
    "rejects checkout when Stripe has a %s subscription",
    async (status) => {
      stripeSubscriptionListMock.mockResolvedValue({
        data: [{ id: `sub_${status}`, status }],
        has_more: false,
      });

      const response = await POST(request({
        operationId,
        bundles: ["ai_power_tools"],
        addOns: [],
        billingInterval: "annual",
      }));

      expect(response.status).toBe(409);
      expect(checkoutCreateMock).not.toHaveBeenCalled();
    },
  );

  it("allows checkout when all Stripe subscriptions are terminal", async () => {
    stripeSubscriptionListMock.mockResolvedValue({
      data: [
        { id: "sub_canceled", status: "canceled" },
        { id: "sub_expired", status: "incomplete_expired" },
      ],
      has_more: false,
    });

    const response = await POST(request({
      operationId,
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    }));

    expect(response.status).toBe(200);
    expect(checkoutCreateMock).toHaveBeenCalledOnce();
  });

  it("checks later Stripe subscription pages before creating a session", async () => {
    stripeSubscriptionListMock
      .mockResolvedValueOnce({
        data: [{ id: "sub_canceled", status: "canceled" }],
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [{ id: "sub_active", status: "active" }],
        has_more: false,
      });

    const response = await POST(request({
      operationId,
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    }));

    expect(response.status).toBe(409);
    expect(stripeSubscriptionListMock).toHaveBeenNthCalledWith(2, {
      customer: "cus_1",
      status: "all",
      limit: 100,
      starting_after: "sub_canceled",
    });
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a new session while a subscription checkout is open", async () => {
    checkoutListMock.mockResolvedValue({
      data: [{ id: "cs_open", mode: "subscription" }],
      has_more: false,
    });

    const response = await POST(request({
      operationId,
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "A subscription checkout is already in progress.",
    });
    expect(stripeSubscriptionListMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("returns the matching open session after a commit or response failure", async () => {
    checkoutListMock.mockResolvedValue({
      data: [{
        id: "cs_open",
        mode: "subscription",
        metadata: { agentId: "agent-1", operationId },
        url: "https://checkout.stripe.com/recovered-session",
      }],
      has_more: false,
    });

    const response = await POST(request({
      operationId,
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.com/recovered-session",
    });
    expect(stripeSubscriptionListMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("requires a caller operation ID", async () => {
    const response = await POST(request({
      bundles: [],
      addOns: ["extra_ai_credits"],
    }));

    expect(response.status).toBe(400);
    expect(getOrCreateCustomerMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });
});
