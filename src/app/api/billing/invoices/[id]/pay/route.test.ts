import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  agentFindFirstMock,
  invoiceRetrieveMock,
  invoicePayMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  agentFindFirstMock: vi.fn(),
  invoiceRetrieveMock: vi.fn(),
  invoicePayMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAuthApi: requireAuthApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { agent: { findFirst: agentFindFirstMock } },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { invoices: { retrieve: invoiceRetrieveMock, pay: invoicePayMock } },
}));

import { POST } from "./route";

const authed = {
  user: { id: "u1", email: "a@x.com" },
  profile: { email: "a@x.com" },
};

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(): NextRequest {
  return new NextRequest("http://localhost/api/billing/invoices/in_1/pay", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthApiMock.mockResolvedValue(authed);
  agentFindFirstMock.mockResolvedValue({
    stripeCustomer: { stripeCustomerId: "cus_me" },
  });
});

describe("POST /api/billing/invoices/[id]/pay", () => {
  it("returns 404 when the invoice belongs to another customer (IDOR blocked)", async () => {
    invoiceRetrieveMock.mockResolvedValue({ customer: "cus_victim" });
    const res = await POST(req(), ctx("in_victim"));
    expect(res.status).toBe(404);
    expect(invoicePayMock).not.toHaveBeenCalled();
  });

  it("pays the invoice when it belongs to the caller", async () => {
    invoiceRetrieveMock.mockResolvedValue({ customer: "cus_me" });
    invoicePayMock.mockResolvedValue({ status: "paid" });
    const res = await POST(req(), ctx("in_mine"));
    expect(res.status).toBe(200);
    expect(invoicePayMock).toHaveBeenCalledWith("in_mine");
  });
});
