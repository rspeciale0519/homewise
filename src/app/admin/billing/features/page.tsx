import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { FeatureManagement } from "@/components/admin/billing/feature-management";

export const metadata: Metadata = { title: "Features — Admin Billing" };

export default async function FeaturesPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Feature Entitlements
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Configure feature flags, entitlement requirements, and free limits.
      </p>

      <FeatureManagement />
    </div>
  );
}
