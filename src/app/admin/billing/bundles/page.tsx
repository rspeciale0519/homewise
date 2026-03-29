import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { BundleManagement } from "@/components/admin/billing/bundle-management";

export const metadata: Metadata = { title: "Bundles — Admin Billing" };

export default async function BundlesPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Bundles
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Manage subscription bundles, pricing, and feature assignments.
      </p>

      <BundleManagement />
    </div>
  );
}
