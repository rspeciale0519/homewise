import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { AgentBillingTable } from "@/components/admin/billing/agent-billing-table";

export const metadata: Metadata = { title: "Agent Billing — Admin" };

export default async function AgentBillingPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Agent Billing
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        View and manage agent subscriptions, payment status, and billing details.
      </p>

      <AgentBillingTable />
    </div>
  );
}
