import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  featureDeleteMany: vi.fn(),
  featureCreateMany: vi.fn(),
  requireAdmin: vi.fn(),
  stripeProductUpdate: vi.fn(),
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
      findUnique: mocks.productFindUnique,
      update: mocks.productUpdate,
    },
    productFeature: {
      deleteMany: mocks.featureDeleteMany,
      createMany: mocks.featureCreateMany,
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { products: { update: mocks.stripeProductUpdate } },
}));

import { PUT } from "./route";

const context = { params: Promise.resolve({ id: "product-1" }) };
const existingProduct = {
  id: "product-1",
  name: "AI Power Tools",
  slug: "ai_power_tools",
  description: "AI features for agents",
  monthlyAmount: 2_000,
  annualAmount: 20_000,
  productType: "bundle",
  stripeProductId: "prod_1",
};

function request(body: unknown): NextRequest {
  return new NextRequest(
    "https://homewise.test/api/admin/billing/products/product-1",
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("PUT admin billing product", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { id: "admin-1", role: "admin" },
    });
    mocks.productFindUnique.mockResolvedValue(existingProduct);
    mocks.productUpdate.mockResolvedValue({
      ...existingProduct,
      features: [
        { productId: "product-1", featureKey: "ai_cma_reports" },
        { productId: "product-1", featureKey: "ai_lead_scoring" },
      ],
    });
    mocks.stripeProductUpdate.mockResolvedValue({ id: "prod_1" });
  });

  it("replaces feature mappings in the product update operation", async () => {
    const response = await PUT(request({
      featureKeys: ["ai_cma_reports", "ai_lead_scoring"],
    }), context);

    expect(response.status).toBe(200);
    expect(mocks.productUpdate).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: {
        features: {
          deleteMany: {},
          create: [
            { featureKey: "ai_cma_reports" },
            { featureKey: "ai_lead_scoring" },
          ],
        },
      },
      include: { features: true },
    });
    expect(mocks.featureDeleteMany).not.toHaveBeenCalled();
    expect(mocks.featureCreateMany).not.toHaveBeenCalled();
  });

  it("does not erase mappings when the atomic product update fails", async () => {
    mocks.productUpdate.mockRejectedValueOnce(new Error("feature insert failed"));

    const response = await PUT(request({
      featureKeys: ["ai_cma_reports"],
    }), context);

    expect(response.status).toBe(500);
    expect(mocks.featureDeleteMany).not.toHaveBeenCalled();
    expect(mocks.featureCreateMany).not.toHaveBeenCalled();
  });

  it("rejects duplicate feature mappings before database work", async () => {
    const response = await PUT(request({
      featureKeys: ["ai_cma_reports", " AI_CMA_REPORTS "],
    }), context);

    expect(response.status).toBe(400);
    expect(mocks.productFindUnique).not.toHaveBeenCalled();
    expect(mocks.productUpdate).not.toHaveBeenCalled();
  });
});
