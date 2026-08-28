import type { ProductWithFeatures } from "@/app/(marketing)/pricing/page";

export type BillingInterval = "monthly" | "annual";

export type BillingProduct = ProductWithFeatures & {
  isActive: boolean;
};

export interface SubscriptionLineItem {
  productType: string;
  productName: string;
  stripePriceId: string;
  quantity: number;
}

export interface BillingSubscriptionItem extends SubscriptionLineItem {
  billingInterval: BillingInterval | null;
  billingAmount: number | null;
}
