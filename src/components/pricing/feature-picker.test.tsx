import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FeaturePicker } from "./feature-picker";
import type { ProductWithFeatures } from "@/app/(marketing)/pricing/page";

const addOn: ProductWithFeatures = {
  id: "product-1",
  name: "Extra AI Credits Pack",
  slug: "extra_ai_credits",
  description: "Additional AI credits.",
  productType: "add_on",
  monthlyAmount: 1_900,
  annualAmount: 0,
  monthlyPriceId: "price_addon_monthly",
  annualPriceId: null,
  sortOrder: 1,
  features: [],
};

describe("FeaturePicker", () => {
  it("renders configured add-on prices and returns the product slug", () => {
    const onToggleAddOn = vi.fn();

    render(
      <FeaturePicker
        addOns={[addOn]}
        selectedAddOns={new Set()}
        onToggleAddOn={onToggleAddOn}
        loading={false}
      />,
    );

    expect(screen.getByText("Extra AI Credits Pack")).toBeInTheDocument();
    expect(screen.getByText("$19")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add to Plan" }));

    expect(onToggleAddOn).toHaveBeenCalledWith("extra_ai_credits");
  });

  it("does not render entitlement feature controls when no add-ons exist", () => {
    render(
      <FeaturePicker
        addOns={[]}
        selectedAddOns={new Set()}
        onToggleAddOn={vi.fn()}
        loading={false}
      />,
    );

    expect(screen.getByText("No add-ons are available now.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
