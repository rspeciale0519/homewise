import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  constructEventMock,
  agentFindUniqueMock,
  queryRawMock,
  stripeCustomerFindUniqueMock,
  subscriptionFindUniqueMock,
  subscriptionRetrieveMock,
  syncSubscriptionFromStripeMock,
  transactionMock,
} = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  queryRawMock: vi.fn(),
  stripeCustomerFindUniqueMock: vi.fn(),
  subscriptionFindUniqueMock: vi.fn(),
  subscriptionRetrieveMock: vi.fn(),
  syncSubscriptionFromStripeMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: subscriptionRetrieveMock },
  },
}));

vi.mock("@/lib/billing/stripe-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/stripe-sync")>();
  return {
    ...actual,
    syncSubscriptionFromStripe: syncSubscriptionFromStripeMock,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

import { POST } from "./route";

const transactionClient = {
  $queryRaw: queryRawMock,
  agent: { findUnique: agentFindUniqueMock },
  stripeCustomer: { findUnique: stripeCustomerFindUniqueMock },
  subscription: { findUnique: subscriptionFindUniqueMock },
};

function request(signature = "signature-test"): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: "raw-webhook-body",
    headers: { "stripe-signature": signature },
  });
}

function oversizedRequest(): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: "x".repeat(1_000_001),
    headers: { "stripe-signature": "signature-test" },
  });
}

function invoiceEvent(type: "invoice.payment_succeeded" | "invoice.payment_failed") {
  return {
    type,
    data: {
      object: {
        customer: "cus_agent",
        parent: {
          subscription_details: { subscription: "sub_old" },
        },
      },
    },
  };
}

function currentSubscription(status: string) {
  return {
    id: "sub_old",
    customer: "cus_agent",
    status,
    start_date: 100,
    cancel_at_period_end: false,
    trial_end: null,
    items: {
      data: [
        {
          current_period_start: 200,
          current_period_end: 300,
        },
      ],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  queryRawMock.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
  agentFindUniqueMock.mockResolvedValue({
    stripeCustomer: { stripeCustomerId: "cus_agent" },
    subscription: {
      status: "active",
      stripeSubscriptionId: "sub_old",
    },
  });
  stripeCustomerFindUniqueMock.mockResolvedValue({ agentId: "agent-1" });
  subscriptionFindUniqueMock.mockImplementation(
    ({ where }: { where: { stripeSubscriptionId?: string; agentId?: string } }) => {
      if (where.stripeSubscriptionId === "sub_old") {
        return Promise.resolve({ agentId: "agent-1" });
      }
      if (where.agentId === "agent-1") {
        return Promise.resolve({
          status: "active",
          stripeSubscriptionId: "sub_old",
        });
      }
      return Promise.resolve(null);
    },
  );
  syncSubscriptionFromStripeMock.mockResolvedValue(undefined);
  transactionMock.mockImplementation(
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/webhooks/stripe", () => {
  it("rejects an oversized body before signature verification", async () => {
    const response = await POST(oversizedRequest());

    expect(response.status).toBe(413);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("rejects a request without a signature before reading its body", async () => {
    const response = await POST(new NextRequest(
      "http://localhost/api/webhooks/stripe",
      { method: "POST", body: "x".repeat(1_000_001) },
    ));

    expect(response.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("keeps Stripe signature verification before event processing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    constructEventMock.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(constructEventMock).toHaveBeenCalledWith(
      "raw-webhook-body",
      "signature-test",
      "whsec_test",
    );
    expect(transactionMock).not.toHaveBeenCalled();
    expect(syncSubscriptionFromStripeMock).not.toHaveBeenCalled();
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
  ] as const)("retrieves current state for %s", async (eventType) => {
    const liveSubscription = currentSubscription("active");
    constructEventMock.mockReturnValue({
      type: eventType,
      data: {
        object: {
          id: "sub_old",
          customer: "cus_agent",
          status: "past_due",
        },
      },
    });
    subscriptionRetrieveMock.mockResolvedValue(liveSubscription);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(subscriptionRetrieveMock).toHaveBeenCalledWith("sub_old");
    expect(queryRawMock).toHaveBeenCalledOnce();
    expect(syncSubscriptionFromStripeMock).toHaveBeenCalledWith(
      liveSubscription,
      transactionClient,
    );
  });

  it("reconciles a late update from Stripe's current canceled state", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_old", customer: "cus_agent", status: "active" },
      },
    });
    const canceledSubscription = currentSubscription("canceled");
    subscriptionRetrieveMock.mockResolvedValue(canceledSubscription);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(syncSubscriptionFromStripeMock).toHaveBeenCalledWith(
      canceledSubscription,
      transactionClient,
    );
  });

  it("fails closed when the live customer differs from the locked agent customer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_old", customer: "cus_other", status: "active" },
      },
    });
    subscriptionRetrieveMock.mockResolvedValue({
      ...currentSubscription("active"),
      customer: "cus_other",
    });

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(queryRawMock).toHaveBeenCalledOnce();
    expect(syncSubscriptionFromStripeMock).not.toHaveBeenCalled();
  });

  it("does not cancel a replacement subscription for a stale deleted event", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_old", customer: "cus_agent" } },
    });
    subscriptionFindUniqueMock.mockImplementation(
      ({ where }: { where: { stripeSubscriptionId?: string; agentId?: string } }) => {
        if (where.stripeSubscriptionId === "sub_old") return Promise.resolve(null);
        if (where.agentId === "agent-1") {
          return Promise.resolve({
            status: "active",
            stripeSubscriptionId: "sub_new",
          });
        }
        return Promise.resolve(null);
      },
    );
    agentFindUniqueMock.mockResolvedValueOnce({
      stripeCustomer: { stripeCustomerId: "cus_agent" },
      subscription: {
        status: "active",
        stripeSubscriptionId: "sub_new",
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(queryRawMock).toHaveBeenCalledOnce();
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
    expect(syncSubscriptionFromStripeMock).not.toHaveBeenCalled();
  });

  it("reconciles deletion only while the deleted subscription ID still matches", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_old", customer: "cus_agent" } },
    });
    const canceledSubscription = currentSubscription("canceled");
    subscriptionRetrieveMock.mockResolvedValue(canceledSubscription);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(syncSubscriptionFromStripeMock).toHaveBeenCalledWith(
      canceledSubscription,
      transactionClient,
    );
  });

  it.each([
    ["invoice.payment_failed", "active"],
    ["invoice.payment_succeeded", "past_due"],
  ] as const)(
    "uses current Stripe state for an out-of-order %s event",
    async (eventType, currentStatus) => {
      constructEventMock.mockReturnValue(invoiceEvent(eventType));
      subscriptionRetrieveMock.mockResolvedValue(
        currentSubscription(currentStatus),
      );

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(subscriptionRetrieveMock).toHaveBeenCalledWith("sub_old");
      expect(queryRawMock).toHaveBeenCalledOnce();
      expect(syncSubscriptionFromStripeMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: currentStatus }),
        transactionClient,
      );
    },
  );
});
