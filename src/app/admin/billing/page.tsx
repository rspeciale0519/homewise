import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { RevenueDashboard } from "@/components/admin/billing/revenue-dashboard";

export const metadata: Metadata = { title: "Revenue — Admin Billing" };

export default async function BillingDashboardPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Revenue Dashboard
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Subscription metrics, MRR, and billing health overview.
      </p>

      <RevenueDashboard />
    </div>
  );
}
