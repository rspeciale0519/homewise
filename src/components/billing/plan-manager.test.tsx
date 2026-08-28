import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlanManager } from "./plan-manager";
import type { ProductWithFeatures } from "@/app/(marketing)/pricing/page";

const bundle: ProductWithFeatures & { isActive: boolean } = {
  id: "bundle-1",
  name: "AI Power Tools",
  slug: "ai_power_tools",
  description: "AI tools.",
  productType: "ai_power_tools",
  monthlyAmount: 4_900,
  annualAmount: 49_900,
  monthlyPriceId: "price_bundle_monthly",
  annualPriceId: "price_bundle_annual",
  sortOrder: 1,
  isActive: true,
  features: [],
};

const addOn: ProductWithFeatures & { isActive: boolean } = {
  id: "addon-1",
  name: "Extra AI Credits Pack",
  slug: "extra_ai_credits",
  description: "Additional AI credits.",
  productType: "add_on",
  monthlyAmount: 1_900,
  annualAmount: 0,
  monthlyPriceId: "price_addon_monthly",
  annualPriceId: null,
  sortOrder: 2,
  isActive: true,
  features: [],
};

const membership: ProductWithFeatures & { isActive: boolean } = {
  id: "membership-1",
  name: "RIUSA Annual Dues",
  slug: "riusa_annual_dues",
  description: "Annual membership dues for RIUSA agents.",
  productType: "membership",
  monthlyAmount: 0,
  annualAmount: 19_500,
  monthlyPriceId: null,
  annualPriceId: "price_membership_annual",
  sortOrder: 0,
  isActive: true,
  features: [],
};

const productConfigs = [bundle, addOn];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlanManager", () => {
  it("starts a new checkout with selected plans and no add-ons", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>(() => undefined),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PlanManager
        subscription={null}
        productConfigs={productConfigs}
        entitlements={[]}
        isNewSubscription
      />,
    );

    expect(screen.queryByText(addOn.name)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Build Your Own" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Bundle" }));
    fireEvent.click(screen.getByRole("button", { name: "Subscribe & Checkout" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const options = fetchMock.mock.calls[0]?.[1];
    if (!options) throw new Error("Expected checkout request options");
    expect(JSON.parse(options.body as string)).toEqual({
      operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      bundles: ["ai_power_tools"],
      addOns: [],
      billingInterval: "annual",
    });
  });

  it("sends an explicit add-on removal for an active subscription", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>(() => undefined),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PlanManager
        subscription={{
          items: [{
            productType: "add_on",
            productName: addOn.name,
            stripePriceId: "price_addon_monthly",
            quantity: 1,
          }],
        }}
        productConfigs={productConfigs}
        entitlements={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Current add-ons" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Remove" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/billing/subscription/modify");
    expect(options).toEqual(expect.objectContaining({ method: "PUT" }));
    expect(JSON.parse(options?.body as string)).toEqual({
      operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      addBundles: [],
      removeBundles: [],
      addOns: [],
      removeAddOns: ["extra_ai_credits"],
    });
  });

  it("disables removal for the final active bundle", () => {
    render(
      <PlanManager
        subscription={{
          items: [{
            productType: "ai_power_tools",
            productName: bundle.name,
            stripePriceId: "price_bundle_monthly",
            quantity: 1,
          }],
        }}
        productConfigs={productConfigs}
        entitlements={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove Bundle" })).toBeDisabled();
    expect(
      screen.getByText("Cancel the subscription to remove the final plan."),
    ).toBeInTheDocument();
  });

  it("allows removal when another active plan remains", () => {
    render(
      <PlanManager
        subscription={{
          items: [
            {
              productType: "ai_power_tools",
              productName: bundle.name,
              stripePriceId: "price_bundle_monthly",
              quantity: 1,
            },
            {
              productType: "membership",
              productName: membership.name,
              stripePriceId: "price_membership_annual",
              quantity: 1,
            },
          ],
        }}
        productConfigs={[bundle, membership]}
        entitlements={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove Bundle" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Remove Membership" }),
    ).toBeEnabled();
  });

  it("offers and manages the annual-only RIUSA membership", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>(() => undefined),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PlanManager
        subscription={null}
        productConfigs={[membership]}
        entitlements={[]}
        isNewSubscription
      />,
    );

    expect(screen.getByText("RIUSA Annual Dues")).toBeInTheDocument();
    expect(screen.getByText(/Billed annually/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Monthly" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Membership" }));
    fireEvent.click(screen.getByRole("button", { name: "Subscribe & Checkout" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const options = fetchMock.mock.calls[0]?.[1];
    if (!options) throw new Error("Expected checkout request options");
    expect(JSON.parse(options.body as string)).toEqual({
      operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      bundles: ["riusa_annual_dues"],
      addOns: [],
      billingInterval: "annual",
    });
  });

  it("disables removal for the final active RIUSA membership", () => {
    render(
      <PlanManager
        subscription={{
          items: [{
            productType: "membership",
            productName: membership.name,
            stripePriceId: "price_membership_annual",
            quantity: 1,
          }],
        }}
        productConfigs={[membership]}
        entitlements={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove Membership" }),
    ).toBeDisabled();
  });
});
