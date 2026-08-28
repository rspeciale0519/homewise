import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BillingDashboard } from "./billing-dashboard";
import type { BillingProduct } from "./types";

const annualBundle: BillingProduct = {
  id: "bundle-1",
  name: "Annual Bundle",
  slug: "ai_power_tools",
  description: "Annual tools.",
  productType: "ai_power_tools",
  monthlyAmount: 1_200,
  annualAmount: 12_000,
  monthlyPriceId: "price_bundle_monthly",
  annualPriceId: "price_bundle_annual",
  sortOrder: 1,
  isActive: true,
  features: [],
};

const monthlyAddOn: BillingProduct = {
  id: "addon-1",
  name: "Monthly Add-on",
  slug: "extra_ai_credits",
  description: "Monthly credits.",
  productType: "add_on",
  monthlyAmount: 1_900,
  annualAmount: 0,
  monthlyPriceId: "price_addon_monthly",
  annualPriceId: null,
  sortOrder: 2,
  isActive: true,
  features: [],
};

describe("BillingDashboard", () => {
  it("shows each item interval and includes monthly add-ons in the total", () => {
    render(
      <BillingDashboard
        subscription={{
          status: "active",
          currentPeriodStart: "2026-08-01T00:00:00.000Z",
          currentPeriodEnd: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          trialEnd: null,
          items: [
            {
              productType: annualBundle.productType,
              productName: annualBundle.name,
              stripePriceId: "price_bundle_annual",
              quantity: 1,
              billingInterval: "annual",
              billingAmount: 12_000,
            },
            {
              productType: monthlyAddOn.productType,
              productName: monthlyAddOn.name,
              stripePriceId: "price_addon_monthly",
              quantity: 2,
              billingInterval: "monthly",
              billingAmount: 1_900,
            },
          ],
        }}
        paymentRecords={[]}
        hasStripeCustomer
        productConfigs={[annualBundle, monthlyAddOn]}
        entitlements={[]}
      />,
    );

    expect(screen.getByText("$48.00")).toBeInTheDocument();

    const productList = screen.getByRole("list", {
      name: "Subscription products",
    });
    const bundleRow = within(productList)
      .getByText("Annual Bundle")
      .closest("li");
    const addOnRow = within(productList)
      .getByText("Monthly Add-on")
      .closest("li");
    if (!bundleRow || !addOnRow) throw new Error("Expected product rows");

    expect(within(bundleRow).getByText("Annual")).toBeInTheDocument();
    expect(within(bundleRow).getByText("$120.00/year")).toBeInTheDocument();
    expect(within(addOnRow).getByText("Monthly")).toBeInTheDocument();
    expect(within(addOnRow).getByText("Quantity: 2")).toBeInTheDocument();
    expect(within(addOnRow).getByText("$38.00/month")).toBeInTheDocument();

    expect(screen.getByText("$48.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByText(/currently billed/)).toHaveTextContent("annually");
    expect(
      screen.getByRole("button", { name: "Switch to Monthly Billing" }),
    ).toBeInTheDocument();
  });
});
