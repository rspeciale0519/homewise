import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  stripeCustomerFindUniqueMock,
  stripeCustomerCreateMock,
  agentFindUniqueOrThrowMock,
  stripeCustomerRemoteCreateMock,
  productConfigFindManyMock,
  transactionMock,
  subscriptionUpsertMock,
  subscriptionItemDeleteManyMock,
  subscriptionItemCreateManyMock,
} = vi.hoisted(() => ({
  stripeCustomerFindUniqueMock: vi.fn(),
  stripeCustomerCreateMock: vi.fn(),
  agentFindUniqueOrThrowMock: vi.fn(),
  stripeCustomerRemoteCreateMock: vi.fn(),
  productConfigFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  subscriptionUpsertMock: vi.fn(),
  subscriptionItemDeleteManyMock: vi.fn(),
  subscriptionItemCreateManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeCustomer: {
      findUnique: stripeCustomerFindUniqueMock,
      create: stripeCustomerCreateMock,
    },
    agent: { findUniqueOrThrow: agentFindUniqueOrThrowMock },
    productConfig: { findMany: productConfigFindManyMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { customers: { create: stripeCustomerRemoteCreateMock } },
}));

import { getOrCreateStripeCustomer, syncSubscriptionFromStripe } from "./stripe-sync";

function stripeSubscription(status: Stripe.Subscription.Status = "active"): Stripe.Subscription {
  return {
    id: "sub_1",
    customer: "cus_1",
    status,
    start_date: 100,
    cancel_at_period_end: false,
    cancel_at: null,
    trial_end: 400,
    items: {
      data: [
        {
          id: "si_1",
          price: { id: "price_monthly" },
          quantity: 2,
          current_period_start: 200,
          current_period_end: 300,
        },
      ],
    },
  } as Stripe.Subscription;
}

beforeEach(() => {
  vi.clearAllMocks();
  stripeCustomerFindUniqueMock.mockResolvedValue({ agentId: "agent-1" });
  stripeCustomerCreateMock.mockResolvedValue({ stripeCustomerId: "cus_1" });
  agentFindUniqueOrThrowMock.mockResolvedValue({
    id: "agent-1",
    firstName: "Avery",
    lastName: "Agent",
    email: "avery@example.com",
    slug: "avery-agent",
  });
  stripeCustomerRemoteCreateMock.mockResolvedValue({ id: "cus_1" });
  productConfigFindManyMock.mockResolvedValue([
    {
      monthlyPriceId: "price_monthly",
      annualPriceId: null,
      productType: "website",
      name: "Agent Website",
    },
  ]);
  subscriptionUpsertMock.mockResolvedValue({ id: "local-subscription-1" });
  subscriptionItemDeleteManyMock.mockResolvedValue({ count: 1 });
  subscriptionItemCreateManyMock.mockResolvedValue({ count: 1 });
  transactionMock.mockImplementation(async (callback) => callback({
    subscription: { upsert: subscriptionUpsertMock },
    subscriptionItem: {
      deleteMany: subscriptionItemDeleteManyMock,
      createMany: subscriptionItemCreateManyMock,
    },
  }));
});

describe("getOrCreateStripeCustomer", () => {
  it("returns an existing customer without a Stripe write", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValueOnce({
      stripeCustomerId: "cus_existing",
    });

    await expect(getOrCreateStripeCustomer("agent-1")).resolves.toBe("cus_existing");
    expect(stripeCustomerRemoteCreateMock).not.toHaveBeenCalled();
  });

  it("creates one Stripe customer with a stable idempotency key", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValueOnce(null);

    await expect(getOrCreateStripeCustomer("agent-1")).resolves.toBe("cus_1");

    expect(stripeCustomerRemoteCreateMock).toHaveBeenCalledWith(
      {
        name: "Avery Agent",
        email: "avery@example.com",
        metadata: { agentId: "agent-1", slug: "avery-agent" },
      },
      { idempotencyKey: "agent-stripe-customer:agent-1" },
    );
    expect(stripeCustomerCreateMock).toHaveBeenCalledWith({
      data: { agentId: "agent-1", stripeCustomerId: "cus_1" },
    });
  });

  it("returns the database race winner after a unique conflict", async () => {
    stripeCustomerFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ stripeCustomerId: "cus_1" });
    stripeCustomerCreateMock.mockRejectedValueOnce({ code: "P2002" });

    await expect(getOrCreateStripeCustomer("agent-1")).resolves.toBe("cus_1");
    expect(stripeCustomerFindUniqueMock).toHaveBeenLastCalledWith({
      where: { agentId: "agent-1" },
    });
  });

  it("does not hide a unique conflict without an agent customer", async () => {
    const conflict = { code: "P2002" };
    stripeCustomerFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    stripeCustomerCreateMock.mockRejectedValueOnce(conflict);

    await expect(getOrCreateStripeCustomer("agent-1")).rejects.toBe(conflict);
  });
});

describe("syncSubscriptionFromStripe", () => {
  it("writes subscription state and replacement items in one transaction", async () => {
    await syncSubscriptionFromStripe(stripeSubscription());

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(subscriptionUpsertMock).toHaveBeenCalledWith({
      where: { agentId: "agent-1" },
      create: {
        agentId: "agent-1",
        stripeSubscriptionId: "sub_1",
        status: "active",
        currentPeriodStart: new Date(200_000),
        currentPeriodEnd: new Date(300_000),
        cancelAtPeriodEnd: false,
        trialEnd: new Date(400_000),
      },
      update: {
        stripeSubscriptionId: "sub_1",
        status: "active",
        currentPeriodStart: new Date(200_000),
        currentPeriodEnd: new Date(300_000),
        cancelAtPeriodEnd: false,
        trialEnd: new Date(400_000),
      },
    });
    expect(subscriptionItemDeleteManyMock).toHaveBeenCalledWith({
      where: { subscriptionId: "local-subscription-1" },
    });
    expect(subscriptionItemCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          subscriptionId: "local-subscription-1",
          stripeItemId: "si_1",
          productType: "website",
          productName: "Agent Website",
          stripePriceId: "price_monthly",
          quantity: 2,
        },
      ],
    });
  });

  it("does not recreate items when current Stripe state is canceled", async () => {
    await syncSubscriptionFromStripe(stripeSubscription("canceled"));

    expect(subscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "canceled" }),
      }),
    );
    expect(subscriptionItemDeleteManyMock).toHaveBeenCalled();
    expect(subscriptionItemCreateManyMock).not.toHaveBeenCalled();
  });

  it("keeps product metadata when the subscribed product is inactive", async () => {
    productConfigFindManyMock.mockResolvedValueOnce([
      {
        isActive: false,
        monthlyPriceId: "price_monthly",
        annualPriceId: null,
        productType: "website",
        name: "Agent Website",
      },
    ]);

    await syncSubscriptionFromStripe(stripeSubscription());

    expect(productConfigFindManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { monthlyPriceId: { in: ["price_monthly"] } },
          { annualPriceId: { in: ["price_monthly"] } },
        ],
      },
    });
    expect(subscriptionItemCreateManyMock).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        productType: "website",
        productName: "Agent Website",
      })],
    });
  });

  it("stores the common period bounds for mixed item periods", async () => {
    const subscription = stripeSubscription();
    subscription.items.data.push({
      id: "si_2",
      price: { id: "price_annual" },
      quantity: 1,
      current_period_start: 250,
      current_period_end: 900,
    } as Stripe.SubscriptionItem);

    await syncSubscriptionFromStripe(subscription);

    expect(subscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          currentPeriodStart: new Date(250_000),
          currentPeriodEnd: new Date(300_000),
        }),
      }),
    );
  });

  it("preserves a cancellation scheduled with cancel_at", async () => {
    const subscription = stripeSubscription();
    subscription.cancel_at = 300;

    await syncSubscriptionFromStripe(subscription);

    expect(subscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ cancelAtPeriodEnd: true }),
      }),
    );
  });
});
