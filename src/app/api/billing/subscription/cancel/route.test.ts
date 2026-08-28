import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  agentFindUniqueMock,
  queryRawMock,
  stripeSubscriptionRetrieveMock,
  stripeSubscriptionUpdateMock,
  syncSubscriptionMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
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

vi.mock("@/lib/billing/stripe-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/stripe-sync")>();
  return { ...actual, syncSubscriptionFromStripe: syncSubscriptionMock };
});

import { POST } from "./route";

const transactionClient = {
  $queryRaw: queryRawMock,
  agent: { findUnique: agentFindUniqueMock },
};

function request(body: string): NextRequest {
  return new NextRequest("http://localhost/api/billing/subscription/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue({ user: { id: "user-1" } });
  agentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    stripeCustomer: { stripeCustomerId: "cus_1" },
    subscription: { stripeSubscriptionId: "sub_1", items: [] },
  });
  stripeSubscriptionRetrieveMock.mockResolvedValue({
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    start_date: 10,
    cancel_at_period_end: false,
    cancel_at: null,
    items: { data: [{ current_period_start: 100, current_period_end: 123 }] },
  });
  stripeSubscriptionUpdateMock.mockResolvedValue({
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    start_date: 10,
    cancel_at_period_end: false,
    items: { data: [{ current_period_start: 100, current_period_end: 123 }] },
    cancel_at: null,
  });
  queryRawMock.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
  syncSubscriptionMock.mockResolvedValue(undefined);
  transactionMock.mockImplementation(
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
});

describe("POST /api/billing/subscription/cancel", () => {
  it("validates and records a bounded cancellation reason", async () => {
    const response = await POST(request(JSON.stringify({ reason: "  temporary  " })));

    expect(response.status).toBe(200);
    expect(stripeSubscriptionUpdateMock).toHaveBeenCalledWith("sub_1", {
      cancel_at: "min_period_end",
      metadata: { cancel_reason: "temporary" },
    });
    expect(queryRawMock).toHaveBeenCalledOnce();
    expect(syncSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sub_1" }),
      transactionClient,
    );
  });

  it("reports the earliest item period end", async () => {
    stripeSubscriptionUpdateMock.mockResolvedValueOnce({
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      start_date: 10,
      cancel_at_period_end: false,
      items: {
        data: [
          { current_period_start: 100, current_period_end: 500 },
          { current_period_start: 200, current_period_end: 300 },
        ],
      },
      cancel_at: null,
    });

    const response = await POST(request(JSON.stringify({})));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, cancelAt: 300 });
  });

  it("rejects unknown request fields", async () => {
    const response = await POST(request(JSON.stringify({ reason: "other", agentId: "agent-2" })));

    expect(response.status).toBe(400);
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects bodies larger than the byte limit", async () => {
    const response = await POST(request(JSON.stringify({ reason: "x".repeat(1_100) })));

    expect(response.status).toBe(413);
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
  });

  it("does not repeat a cancellation that Stripe already scheduled", async () => {
    stripeSubscriptionRetrieveMock.mockResolvedValueOnce({
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      start_date: 10,
      cancel_at_period_end: false,
      cancel_at: 456,
      items: { data: [{ current_period_start: 100, current_period_end: 456 }] },
    });

    const response = await POST(request(JSON.stringify({ reason: "temporary" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, cancelAt: 456 });
    expect(stripeSubscriptionUpdateMock).not.toHaveBeenCalled();
    expect(syncSubscriptionMock).toHaveBeenCalledOnce();
  });
});
