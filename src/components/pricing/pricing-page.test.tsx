import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ProductWithFeatures } from "@/app/(marketing)/pricing/page";

const { getUserMock, pushMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}));

import { PricingPage } from "./pricing-page";

const bundle: ProductWithFeatures = {
  id: "product-1",
  name: "AI Power Tools",
  slug: "ai_power_tools",
  description: "AI tools.",
  productType: "ai_power_tools",
  monthlyAmount: 4_900,
  annualAmount: 49_900,
  monthlyPriceId: "price_bundle_monthly",
  annualPriceId: "price_bundle_annual",
  sortOrder: 1,
  features: [],
};

describe("PricingPage checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits bundle slugs with one stable checkout operation ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PricingPage
        bundles={[bundle]}
        addOns={[]}
        entitlements={[{
          id: "entitlement-1",
          featureKey: "ai_cma_reports",
          featureName: "AI CMA Reports",
          requiredProduct: "ai_power_tools",
          freeLimit: null,
          description: null,
        }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Build Your Own" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Subscribe & Checkout" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Subscribe & Checkout" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const firstBody = JSON.parse(firstOptions.body as string) as Record<string, unknown>;
    const secondBody = JSON.parse(secondOptions.body as string) as Record<string, unknown>;

    expect(firstBody).toEqual({
      operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    });
    expect(secondBody.operationId).toBe(firstBody.operationId);
  });
});
