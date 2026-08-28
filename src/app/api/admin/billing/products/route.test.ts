import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  productConfigCreate: vi.fn(),
  productConfigFindUnique: vi.fn(),
  productConfigUpdate: vi.fn(),
  requireAdmin: vi.fn(),
  stripePriceCreate: vi.fn(),
  stripeProductCreate: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: mocks.requireAdmin,
  isError: (result: unknown) => (
    typeof result === "object" && result !== null && "error" in result
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productConfig: {
      create: mocks.productConfigCreate,
      findUnique: mocks.productConfigFindUnique,
      update: mocks.productConfigUpdate,
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    prices: { create: mocks.stripePriceCreate },
    products: { create: mocks.stripeProductCreate },
  },
}));

vi.mock("@/lib/api-error", () => ({ logApiError: vi.fn() }));

import { POST } from "./route";

const input = {
  name: "AI Power Tools",
  slug: "ai_power_tools",
  description: "AI tools for agents.",
  monthlyAmount: 4_900,
  annualAmount: 49_900,
  productType: "ai_power_tools",
  isActive: true,
  sortOrder: 2,
  featureKeys: ["ai_cma_reports"],
};

const reservation = {
  id: "product-config-1",
  ...input,
  isActive: false,
  stripeProductId: null,
  monthlyPriceId: null,
  annualPriceId: null,
  features: [{ id: "feature-1", featureKey: "ai_cma_reports" }],
};

const completeBundle = {
  ...reservation,
  isActive: true,
  stripeProductId: "prod_1",
  monthlyPriceId: "price_monthly",
  annualPriceId: "price_annual",
};

function request(body: unknown = input): NextRequest {
  return new NextRequest("https://homewise.test/api/admin/billing/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string): NextRequest {
  return new NextRequest("https://homewise.test/api/admin/billing/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST admin billing product", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { id: "admin-1", role: "admin" },
    });
    mocks.productConfigFindUnique.mockResolvedValue(null);
    mocks.productConfigCreate.mockResolvedValue(reservation);
    mocks.productConfigUpdate.mockImplementation(
      async (args: { data: Record<string, unknown> }) => (
        "monthlyPriceId" in args.data
          ? completeBundle
          : { ...reservation, stripeProductId: "prod_1" }
      ),
    );
    mocks.stripeProductCreate.mockResolvedValue({ id: "prod_1" });
    mocks.stripePriceCreate
      .mockResolvedValueOnce({ id: "price_monthly" })
      .mockResolvedValueOnce({ id: "price_annual" });
  });

  it("creates a local reservation before Stripe resources", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.productConfigCreate).toHaveBeenCalledWith({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        monthlyAmount: input.monthlyAmount,
        annualAmount: input.annualAmount,
        productType: input.productType,
        isActive: false,
        sortOrder: input.sortOrder,
        features: { create: [{ featureKey: "ai_cma_reports" }] },
      },
      include: { features: true },
    });
    expect(mocks.stripeProductCreate).toHaveBeenCalledWith(
      {
        name: input.name,
        description: input.description,
        metadata: {
          slug: input.slug,
          productType: input.productType,
          productConfigId: "product-config-1",
        },
      },
      {
        idempotencyKey: "admin-billing-product:product-config-1:product",
      },
    );
    expect(mocks.stripePriceCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        product: "prod_1",
        unit_amount: input.monthlyAmount,
        recurring: { interval: "month" },
      }),
      {
        idempotencyKey:
          "admin-billing-product:product-config-1:monthly-price",
      },
    );
    expect(mocks.stripePriceCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        product: "prod_1",
        unit_amount: input.annualAmount,
        recurring: { interval: "year" },
      }),
      {
        idempotencyKey:
          "admin-billing-product:product-config-1:annual-price",
      },
    );
    expect(mocks.productConfigUpdate).toHaveBeenLastCalledWith({
      where: { id: "product-config-1" },
      data: {
        stripeProductId: "prod_1",
        monthlyPriceId: "price_monthly",
        annualPriceId: "price_annual",
        isActive: true,
      },
      include: { features: true },
    });
  });

  it("returns an exact completed retry without new Stripe resources", async () => {
    mocks.productConfigFindUnique.mockResolvedValue(completeBundle);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.productConfigCreate).not.toHaveBeenCalled();
    expect(mocks.productConfigUpdate).not.toHaveBeenCalled();
    expect(mocks.stripeProductCreate).not.toHaveBeenCalled();
    expect(mocks.stripePriceCreate).not.toHaveBeenCalled();
  });

  it("resumes an inactive reservation without creating another product", async () => {
    mocks.productConfigFindUnique.mockResolvedValue({
      ...reservation,
      stripeProductId: "prod_1",
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.productConfigCreate).not.toHaveBeenCalled();
    expect(mocks.stripeProductCreate).not.toHaveBeenCalled();
    expect(mocks.stripePriceCreate).toHaveBeenCalledTimes(2);
    expect(mocks.productConfigUpdate).toHaveBeenCalledOnce();
  });

  it("rejects a slug that has different stored settings", async () => {
    mocks.productConfigFindUnique.mockResolvedValue({
      ...completeBundle,
      description: "Different settings.",
    });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.stripeProductCreate).not.toHaveBeenCalled();
    expect(mocks.stripePriceCreate).not.toHaveBeenCalled();
  });

  it("does not create Stripe resources when the reservation fails", async () => {
    mocks.productConfigCreate.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.stripeProductCreate).not.toHaveBeenCalled();
    expect(mocks.stripePriceCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON before database work", async () => {
    const response = await POST(rawRequest("{"));

    expect(response.status).toBe(400);
    expect(mocks.productConfigFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeProductCreate).not.toHaveBeenCalled();
  });

  it("rejects an oversized request before database work", async () => {
    const response = await POST(request("x".repeat(10_001)));

    expect(response.status).toBe(413);
    expect(mocks.productConfigFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeProductCreate).not.toHaveBeenCalled();
  });
});
