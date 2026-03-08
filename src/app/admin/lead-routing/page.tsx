import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { LeadRoutingView } from "./lead-routing-view";

export const metadata: Metadata = { title: "Lead Routing — Admin" };

export default async function LeadRoutingPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Lead Routing</h1>
      <p className="text-slate-500 text-sm mb-8">Configure rules for automatic lead assignment to agents</p>
      <LeadRoutingView />
    </div>
  );
}
