import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  agentFindUniqueMock,
  paymentMethodRetrieveMock,
  customerUpdateMock,
  stripeCustomerUpdateMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  paymentMethodRetrieveMock: vi.fn(),
  customerUpdateMock: vi.fn(),
  stripeCustomerUpdateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAuthApi: requireAuthApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agent: { findUnique: agentFindUniqueMock },
    stripeCustomer: { update: stripeCustomerUpdateMock },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentMethods: { retrieve: paymentMethodRetrieveMock },
    customers: { update: customerUpdateMock },
  },
}));

import { PUT } from "./route";

const request = new NextRequest(
  "http://localhost/api/billing/payment-methods/pm_1/default",
  { method: "PUT" },
);

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue({
    user: { id: "user-1" },
    profile: { email: "agent@example.com" },
  });
  agentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    stripeCustomer: { stripeCustomerId: "cus_me" },
  });
});

describe("PUT /api/billing/payment-methods/[id]/default", () => {
  it("rejects a payment method owned by another customer", async () => {
    paymentMethodRetrieveMock.mockResolvedValue({ customer: "cus_other" });

    const response = await PUT(request, context("pm_other"));

    expect(response.status).toBe(404);
    expect(customerUpdateMock).not.toHaveBeenCalled();
    expect(stripeCustomerUpdateMock).not.toHaveBeenCalled();
    expect(agentFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("sets a payment method owned by the current customer", async () => {
    paymentMethodRetrieveMock.mockResolvedValue({ customer: "cus_me" });
    customerUpdateMock.mockResolvedValue({});
    stripeCustomerUpdateMock.mockResolvedValue({});

    const response = await PUT(request, context("pm_mine"));

    expect(response.status).toBe(200);
    expect(customerUpdateMock).toHaveBeenCalledWith("cus_me", {
      invoice_settings: { default_payment_method: "pm_mine" },
    });
    expect(stripeCustomerUpdateMock).toHaveBeenCalledWith({
      where: { agentId: "agent-1" },
      data: { defaultPaymentMethod: "pm_mine" },
    });
  });
});
