import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  agentFindUnique: vi.fn(),
  productConfigFindMany: vi.fn(),
  queryRaw: vi.fn(),
  requireAdmin: vi.fn(),
  stripeCancel: vi.fn(),
  stripeRetrieve: vi.fn(),
  stripeUpdate: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  syncSubscription: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: mocks.requireAdmin,
  isError: (result: unknown) => (
    typeof result === "object" && result !== null && "error" in result
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: mocks.subscriptionFindUnique },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      cancel: mocks.stripeCancel,
      retrieve: mocks.stripeRetrieve,
      update: mocks.stripeUpdate,
    },
  },
}));

vi.mock("@/lib/billing/stripe-sync", () => ({
  syncSubscriptionFromStripe: mocks.syncSubscription,
}));

vi.mock("@/lib/api-error", () => ({ logApiError: vi.fn() }));

import { DELETE, PUT } from "./route";

const context = { params: Promise.resolve({ id: "agent-1" }) };
const transactionClient = {
  $queryRaw: mocks.queryRaw,
  agent: { findUnique: mocks.agentFindUnique },
  productConfig: { findMany: mocks.productConfigFindMany },
};

const archivedTarget = {
  slug: "legacy_ai_plan",
  productType: "ai_bundle",
  isActive: false,
  platforms: ["homewise"],
  monthlyPriceId: "price_target_monthly",
  annualPriceId: "price_target_annual",
};

const sameTypeProduct = {
  slug: "current_ai_plan",
  productType: "ai_bundle",
  isActive: true,
  platforms: ["homewise"],
  monthlyPriceId: "price_other_monthly",
  annualPriceId: "price_other_annual",
};

function stripeSubscription(
  items: { id: string; priceId: string }[],
  status = "active",
) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status,
    items: {
      data: items.map((item) => ({
        id: item.id,
        price: { id: item.priceId },
      })),
    },
  };
}

function deleteRequest(): NextRequest {
  return new NextRequest(
    "https://homewise.test/api/admin/billing/agents/agent-1/subscription",
    { method: "DELETE" },
  );
}

function request(body: unknown): NextRequest {
  return new NextRequest(
    "https://homewise.test/api/admin/billing/agents/agent-1/subscription",
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("admin subscription route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { id: "admin-1", role: "admin" },
    });
    mocks.agentFindUnique.mockResolvedValue({
      platform: "homewise",
      stripeCustomer: { stripeCustomerId: "cus_1" },
      subscription: { stripeSubscriptionId: "sub_1" },
    });
    mocks.productConfigFindMany.mockResolvedValue([
      archivedTarget,
      sameTypeProduct,
    ]);
    mocks.queryRaw.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
    mocks.subscriptionFindUnique.mockResolvedValue({
      id: "local-subscription-1",
      items: [],
    });
    mocks.syncSubscription.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(
      async (
        callback: (tx: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    );
  });

  it("removes an archived product by its exact subscribed price", async () => {
    const current = stripeSubscription([
      { id: "si_target", priceId: "price_target_annual" },
      { id: "si_other", priceId: "price_other_annual" },
    ]);
    const updated = stripeSubscription([
      { id: "si_other", priceId: "price_other_annual" },
    ]);
    mocks.stripeRetrieve.mockResolvedValue(current);
    mocks.stripeUpdate.mockResolvedValue(updated);

    const response = await PUT(
      request({ removeBundles: ["legacy_ai_plan"] }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
    expect(mocks.stripeUpdate).toHaveBeenCalledWith("sub_1", {
      items: [{ id: "si_target", deleted: true }],
    });
    expect(mocks.syncSubscription).toHaveBeenCalledWith(
      updated,
      transactionClient,
    );
  });

  it("does not remove another product with the same product type", async () => {
    const current = stripeSubscription([
      { id: "si_other", priceId: "price_other_annual" },
    ]);
    mocks.stripeRetrieve.mockResolvedValue(current);

    const response = await PUT(
      request({ removeBundles: ["legacy_ai_plan"] }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.stripeUpdate).not.toHaveBeenCalled();
    expect(mocks.syncSubscription).toHaveBeenCalledWith(
      current,
      transactionClient,
    );
  });

  it("rejects adding an archived product", async () => {
    mocks.stripeRetrieve.mockResolvedValue(stripeSubscription([]));

    const response = await PUT(
      request({ addBundles: ["legacy_ai_plan"] }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mocks.stripeUpdate).not.toHaveBeenCalled();
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it("rejects removing the final plan", async () => {
    mocks.stripeRetrieve.mockResolvedValue(stripeSubscription([
      { id: "si_target", priceId: "price_target_annual" },
    ]));

    const response = await PUT(
      request({ removeBundles: ["legacy_ai_plan"] }),
      context,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "A subscription must keep at least one plan. Cancel the subscription instead.",
    });
    expect(mocks.stripeUpdate).not.toHaveBeenCalled();
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it("locks and verifies the customer before canceling", async () => {
    const current = stripeSubscription([]);
    const canceled = stripeSubscription([], "canceled");
    mocks.stripeRetrieve.mockResolvedValue(current);
    mocks.stripeCancel.mockResolvedValue(canceled);

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(200);
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
    expect(mocks.stripeRetrieve).toHaveBeenCalledWith("sub_1");
    expect(mocks.stripeCancel).toHaveBeenCalledWith("sub_1");
    expect(mocks.syncSubscription).toHaveBeenCalledWith(
      canceled,
      transactionClient,
    );
  });

  it("reconciles a canceled subscription without canceling it again", async () => {
    const canceled = stripeSubscription([], "canceled");
    mocks.stripeRetrieve.mockResolvedValue(canceled);

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(200);
    expect(mocks.stripeCancel).not.toHaveBeenCalled();
    expect(mocks.syncSubscription).toHaveBeenCalledWith(
      canceled,
      transactionClient,
    );
  });

  it("rejects a cancellation when the Stripe customer does not match", async () => {
    mocks.stripeRetrieve.mockResolvedValue({
      ...stripeSubscription([]),
      customer: "cus_other",
    });

    const response = await DELETE(deleteRequest(), context);

    expect(response.status).toBe(409);
    expect(mocks.stripeCancel).not.toHaveBeenCalled();
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });
});
