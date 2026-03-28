import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PricingPage } from "@/components/pricing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Home Wise Realty Group",
  description:
    "Join Home Wise Realty Group with our annual membership. Add optional bundles for AI tools, marketing automation, and growth analytics.",
};

export type BundleWithFeatures = {
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

export default async function PricingServerPage() {
  const configs = await prisma.bundleConfig.findMany({
    where: { isActive: true },
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
  });

  const membership = configs.find((b) => b.productType === "membership") ?? null;
  const bundles = configs.filter((b) =>
    ["ai_power_tools", "marketing_suite", "growth_engine"].includes(b.productType),
  );
  const addOns = configs.filter((b) => b.productType === "add_on");

  return (
    <PricingPage
      membership={membership}
      bundles={bundles}
      addOns={addOns}
    />
  );
}
