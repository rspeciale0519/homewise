import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PricingPage } from "@/components/pricing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Home Wise Realty Group",
  description:
    "Transparent pricing for Home Wise agents. Choose the bundles and features that match how you work — no required annual fees.",
};

export type ProductWithFeatures = {
  id: string;
  name: string;
  slug: string;
  description: string;
  productType: string;
  monthlyAmount: number;
  annualAmount: number;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  sortOrder: number;
  features: { featureKey: string; limit: number | null }[];
};

export type FeatureEntitlement = {
  id: string;
  featureKey: string;
  featureName: string;
  requiredProduct: string | null;
  freeLimit: number | null;
  description: string | null;
};

export default async function PricingServerPage() {
  const [configs, entitlements] = await Promise.all([
    prisma.productConfig.findMany({
      where: { isActive: true, platforms: { has: "homewise" } },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        productType: true,
        monthlyAmount: true,
        annualAmount: true,
        monthlyPriceId: true,
        annualPriceId: true,
        sortOrder: true,
        features: {
          select: { featureKey: true, limit: true },
        },
      },
    }),
    prisma.entitlementConfig.findMany({
      where: {
        isActive: true,
        requiredProduct: { not: null },
        platforms: { has: "homewise" },
      },
      select: {
        id: true,
        featureKey: true,
        featureName: true,
        requiredProduct: true,
        freeLimit: true,
        description: true,
      },
    }),
  ]);

  const bundleOrder = ["marketing_suite", "ai_power_tools", "growth_engine"];
  const bundles = configs
    .filter((b) => bundleOrder.includes(b.productType))
    .sort((a, b) => bundleOrder.indexOf(a.productType) - bundleOrder.indexOf(b.productType));

  const addOns = configs.filter((b) => b.productType === "add_on");

  return (
    <PricingPage
      bundles={bundles}
      addOns={addOns}
      entitlements={entitlements}
    />
  );
}
