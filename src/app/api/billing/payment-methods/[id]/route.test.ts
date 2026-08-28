import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAuthApiMock, agentFindUniqueMock, pmRetrieveMock, pmDetachMock } =
  vi.hoisted(() => ({
    requireAuthApiMock: vi.fn(),
    agentFindUniqueMock: vi.fn(),
    pmRetrieveMock: vi.fn(),
    pmDetachMock: vi.fn(),
  }));

vi.mock("@/lib/admin-api", () => ({
  requireAuthApi: requireAuthApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { agent: { findUnique: agentFindUniqueMock } },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { paymentMethods: { retrieve: pmRetrieveMock, detach: pmDetachMock } },
}));

import { DELETE } from "./route";

const authed = {
  user: { id: "u1", email: "a@x.com" },
  profile: { email: "a@x.com" },
};

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(): NextRequest {
  return new NextRequest("http://localhost/api/billing/payment-methods/pm_1", {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue(authed);
  agentFindUniqueMock.mockResolvedValue({
    stripeCustomer: { stripeCustomerId: "cus_me" },
  });
});

describe("DELETE /api/billing/payment-methods/[id]", () => {
  it("returns 404 when the payment method belongs to another customer (IDOR blocked)", async () => {
    pmRetrieveMock.mockResolvedValue({ customer: "cus_victim" });
    const res = await DELETE(req(), ctx("pm_victim"));
    expect(res.status).toBe(404);
    expect(pmDetachMock).not.toHaveBeenCalled();
    expect(agentFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } }),
    );
  });

  it("detaches the payment method when it belongs to the caller", async () => {
    pmRetrieveMock.mockResolvedValue({ customer: "cus_me" });
    pmDetachMock.mockResolvedValue({});
    const res = await DELETE(req(), ctx("pm_mine"));
    expect(res.status).toBe(200);
    expect(pmDetachMock).toHaveBeenCalledWith("pm_mine");
  });
});
