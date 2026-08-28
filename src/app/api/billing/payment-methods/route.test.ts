import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  agentFindUniqueMock,
  paymentMethodRetrieveMock,
  paymentMethodAttachMock,
  setupIntentRetrieveMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  paymentMethodRetrieveMock: vi.fn(),
  paymentMethodAttachMock: vi.fn(),
  setupIntentRetrieveMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAuthApi: requireAuthApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { agent: { findUnique: agentFindUniqueMock } },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      listPaymentMethods: vi.fn(),
      retrieve: vi.fn(),
    },
    paymentMethods: {
      retrieve: paymentMethodRetrieveMock,
      attach: paymentMethodAttachMock,
    },
    setupIntents: { retrieve: setupIntentRetrieveMock },
  },
}));

import { POST } from "./route";

const authed = {
  user: { id: "user-1" },
  profile: { email: "agent@example.com" },
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/billing/payment-methods", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue(authed);
  agentFindUniqueMock.mockResolvedValue({
    stripeCustomer: { stripeCustomerId: "cus_me" },
  });
});

describe("POST /api/billing/payment-methods", () => {
  it("accepts a payment method already attached to the caller", async () => {
    const paymentMethod = { id: "pm_mine", customer: "cus_me" };
    paymentMethodRetrieveMock.mockResolvedValue(paymentMethod);

    const response = await POST(request({ paymentMethodId: "pm_mine" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(paymentMethod);
    expect(setupIntentRetrieveMock).not.toHaveBeenCalled();
    expect(paymentMethodAttachMock).not.toHaveBeenCalled();
  });

  it("rejects a payment method attached to another customer", async () => {
    paymentMethodRetrieveMock.mockResolvedValue({
      id: "pm_other",
      customer: { id: "cus_other" },
    });

    const response = await POST(
      request({
        paymentMethodId: "pm_other",
        setupIntentId: "seti_other",
      }),
    );

    expect(response.status).toBe(404);
    expect(setupIntentRetrieveMock).not.toHaveBeenCalled();
    expect(paymentMethodAttachMock).not.toHaveBeenCalled();
  });

  it("requires a setup intent for an unattached payment method", async () => {
    paymentMethodRetrieveMock.mockResolvedValue({
      id: "pm_new",
      customer: null,
    });

    const response = await POST(request({ paymentMethodId: "pm_new" }));

    expect(response.status).toBe(400);
    expect(setupIntentRetrieveMock).not.toHaveBeenCalled();
    expect(paymentMethodAttachMock).not.toHaveBeenCalled();
  });

  it("attaches an unattached method after a matching setup intent succeeds", async () => {
    paymentMethodRetrieveMock.mockResolvedValue({
      id: "pm_new",
      customer: null,
    });
    setupIntentRetrieveMock.mockResolvedValue({
      id: "seti_mine",
      status: "succeeded",
      customer: { id: "cus_me" },
      payment_method: { id: "pm_new" },
    });
    paymentMethodAttachMock.mockResolvedValue({
      id: "pm_new",
      customer: "cus_me",
    });

    const response = await POST(
      request({ paymentMethodId: "pm_new", setupIntentId: "seti_mine" }),
    );

    expect(response.status).toBe(200);
    expect(setupIntentRetrieveMock).toHaveBeenCalledWith("seti_mine");
    expect(paymentMethodAttachMock).toHaveBeenCalledWith("pm_new", {
      customer: "cus_me",
    });
  });

  it.each([
    {
      name: "did not succeed",
      setupIntent: {
        status: "requires_action",
        customer: "cus_me",
        payment_method: "pm_new",
      },
    },
    {
      name: "belongs to another customer",
      setupIntent: {
        status: "succeeded",
        customer: "cus_other",
        payment_method: "pm_new",
      },
    },
    {
      name: "references another payment method",
      setupIntent: {
        status: "succeeded",
        customer: "cus_me",
        payment_method: "pm_other",
      },
    },
  ])("rejects a setup intent that $name", async ({ setupIntent }) => {
    paymentMethodRetrieveMock.mockResolvedValue({
      id: "pm_new",
      customer: null,
    });
    setupIntentRetrieveMock.mockResolvedValue(setupIntent);

    const response = await POST(
      request({ paymentMethodId: "pm_new", setupIntentId: "seti_invalid" }),
    );

    expect(response.status).toBe(400);
    expect(paymentMethodAttachMock).not.toHaveBeenCalled();
  });

  it("rejects unknown request fields", async () => {
    const response = await POST(
      request({ paymentMethodId: "pm_new", customer: "cus_other" }),
    );

    expect(response.status).toBe(400);
    expect(paymentMethodRetrieveMock).not.toHaveBeenCalled();
  });

  it("rejects request bodies larger than the byte limit", async () => {
    const response = await POST(
      request({ paymentMethodId: `pm_${"x".repeat(1_100)}` }),
    );

    expect(response.status).toBe(413);
    expect(paymentMethodRetrieveMock).not.toHaveBeenCalled();
  });
});
