import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  agentFindUnique: vi.fn(),
  customer: vi.fn(),
  paymentCreate: vi.fn(),
  paymentFindUnique: vi.fn(),
  paymentIntentCreate: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: mocks.requireAdmin,
  isError: (result: unknown) => (
    typeof result === "object" && result !== null && "error" in result
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: { findUnique: mocks.agentFindUnique },
    paymentRecord: {
      create: mocks.paymentCreate,
      findUnique: mocks.paymentFindUnique,
    },
  },
}));

vi.mock("@/lib/billing/stripe-sync", () => ({
  getOrCreateStripeCustomer: mocks.customer,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { paymentIntents: { create: mocks.paymentIntentCreate } },
}));

vi.mock("@/lib/api-error", () => ({ logApiError: vi.fn() }));

import { POST } from "./route";

const operationId = "123e4567-e89b-42d3-a456-426614174000";
const context = { params: Promise.resolve({ id: "agent-1" }) };

function request(body: unknown): NextRequest {
  return new NextRequest("https://homewise.test/api/admin/billing/agents/agent-1/payment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST admin payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { id: "admin-1", role: "admin" },
    });
    mocks.agentFindUnique.mockResolvedValue({ id: "agent-1" });
    mocks.paymentFindUnique.mockResolvedValue(null);
    mocks.customer.mockResolvedValue("cus_agent");
    mocks.paymentIntentCreate.mockResolvedValue({ id: "pi_1", status: "succeeded" });
    mocks.paymentCreate.mockResolvedValue({ id: "record-1", status: "succeeded" });
  });

  it("uses a caller operation ID as the Stripe idempotency key", async () => {
    const response = await POST(request({
      amount: 5_000,
      paymentMethodId: "pm_1",
      operationId,
    }), context);

    expect(response.status).toBe(201);
    expect(mocks.paymentIntentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5_000, payment_method: "pm_1" }),
      { idempotencyKey: `admin-payment:agent-1:${operationId}` },
    );
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^adminpay_[0-9a-f]{64}$/),
        stripePaymentIntentId: "pi_1",
      }),
    });
  });

  it("returns a prior record without creating another charge", async () => {
    const priorRecord = {
      id: "prior-record",
      agentId: "agent-1",
      amount: 5_000,
      paymentType: "card",
      notes: null,
    };
    mocks.paymentFindUnique.mockResolvedValueOnce(priorRecord);

    const response = await POST(request({
      amount: 5_000,
      paymentMethodId: "pm_1",
      operationId,
    }), context);

    expect(response.status).toBe(200);
    expect(mocks.paymentIntentCreate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      paymentRecord: priorRecord,
    });
  });

  it("rejects a card replay with different payment details", async () => {
    mocks.paymentFindUnique.mockResolvedValueOnce({
      id: "prior-record",
      agentId: "agent-1",
      amount: 7_500,
      paymentType: "card",
      notes: null,
    });

    const response = await POST(request({
      amount: 5_000,
      paymentMethodId: "pm_1",
      operationId,
    }), context);

    expect(response.status).toBe(409);
    expect(mocks.paymentIntentCreate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Operation ID was already used for a different payment",
    });
  });

  it("rejects a mismatched card payment after a unique race", async () => {
    mocks.paymentFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "race-winner",
        agentId: "agent-1",
        amount: 9_000,
        paymentType: "card",
        notes: null,
      });
    mocks.paymentCreate.mockRejectedValueOnce({ code: "P2002" });

    const response = await POST(request({
      amount: 5_000,
      paymentMethodId: "pm_1",
      operationId,
    }), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Operation ID was already used for a different payment",
    });
  });

  it("requires an operation ID for external charges", async () => {
    const response = await POST(request({
      amount: 5_000,
      paymentMethodId: "pm_1",
    }), context);

    expect(response.status).toBe(400);
    expect(mocks.paymentIntentCreate).not.toHaveBeenCalled();
  });

  it("rejects an excessive manual charge", async () => {
    const response = await POST(request({
      amount: 10_000_001,
      paymentMethodId: "pm_1",
      operationId,
    }), context);

    expect(response.status).toBe(400);
    expect(mocks.paymentIntentCreate).not.toHaveBeenCalled();
  });

  it("records an offline payment with a deterministic operation ID", async () => {
    const response = await POST(request({
      amount: 5_000,
      paymentType: "check",
      notes: "  Check 101  ",
      operationId,
    }), context);

    expect(response.status).toBe(201);
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: {
        id: expect.stringMatching(/^adminpay_[0-9a-f]{64}$/),
        agentId: "agent-1",
        amount: 5_000,
        currency: "usd",
        paymentType: "check",
        status: "succeeded",
        processedBy: "admin-1",
        notes: "Check 101",
      },
    });
  });

  it("replays an existing offline payment without another insert", async () => {
    const existingRecord = {
      id: "prior-offline",
      agentId: "agent-1",
      amount: 5_000,
      paymentType: "cash",
      notes: null,
    };
    mocks.paymentFindUnique.mockResolvedValueOnce(existingRecord);

    const response = await POST(request({
      amount: 5_000,
      paymentType: "cash",
      operationId,
    }), context);

    expect(response.status).toBe(200);
    expect(mocks.paymentCreate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      paymentRecord: existingRecord,
    });
  });

  it.each([
    ["agent", { agentId: "agent-2" }],
    ["amount", { amount: 7_500 }],
    ["payment type", { paymentType: "check" }],
    ["notes", { notes: "Another check" }],
  ])("rejects replay when the existing offline payment has a different %s", async (_field, override) => {
    mocks.paymentFindUnique.mockResolvedValueOnce({
      id: "prior-offline",
      agentId: "agent-1",
      amount: 5_000,
      paymentType: "cash",
      notes: "Cash receipt",
      ...override,
    });

    const response = await POST(request({
      amount: 5_000,
      paymentType: "cash",
      notes: "  Cash receipt  ",
      operationId,
    }), context);

    expect(response.status).toBe(409);
    expect(mocks.paymentCreate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Operation ID was already used for a different payment",
    });
  });

  it("recovers an offline payment unique race as a replay", async () => {
    const raceWinner = {
      id: "race-winner",
      agentId: "agent-1",
      amount: 5_000,
      paymentType: "check",
      notes: null,
    };
    mocks.paymentFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raceWinner);
    mocks.paymentCreate.mockRejectedValueOnce({ code: "P2002" });

    const response = await POST(request({
      amount: 5_000,
      paymentType: "check",
      operationId,
    }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      paymentRecord: raceWinner,
    });
  });

  it("rejects a mismatched offline payment after a unique race", async () => {
    mocks.paymentFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "race-winner",
        agentId: "agent-1",
        amount: 9_000,
        paymentType: "check",
        notes: null,
      });
    mocks.paymentCreate.mockRejectedValueOnce({ code: "P2002" });

    const response = await POST(request({
      amount: 5_000,
      paymentType: "check",
      operationId,
    }), context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Operation ID was already used for a different payment",
    });
  });

  it("requires an operation ID for offline payments", async () => {
    const response = await POST(request({
      amount: 5_000,
      paymentType: "check",
    }), context);

    expect(response.status).toBe(400);
    expect(mocks.paymentCreate).not.toHaveBeenCalled();
  });
});
