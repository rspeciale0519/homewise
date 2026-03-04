import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { LeadRoutingView } from "./lead-routing-view";

export const metadata: Metadata = { title: "Lead Routing — Admin" };

export default async function LeadRoutingPage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-navy-700">Lead Routing</h1>
        <p className="text-sm text-slate-500">Configure rules for automatic lead assignment to agents</p>
      </div>
      <LeadRoutingView />
    </div>
  );
}
