import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { BillingSettingsForm } from "@/components/admin/billing/billing-settings-form";

export const metadata: Metadata = { title: "Billing Settings — Admin" };

export default async function BillingSettingsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Billing Settings
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Configure grace periods, trial durations, and billing behavior.
      </p>

      <BillingSettingsForm />
    </div>
  );
}
