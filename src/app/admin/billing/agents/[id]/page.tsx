import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AgentBillingDetail } from "@/components/admin/billing/agent-billing-detail";

export const metadata: Metadata = { title: "Agent Billing Detail — Admin" };

export default async function AgentBillingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  return (
    <div className="max-w-5xl">
      <Link
        href="/admin/billing/agents"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Agent Billing
      </Link>

      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Agent Billing Detail
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Manage subscription, payments, and grace periods for this agent.
      </p>

      <AgentBillingDetail agentId={id} />
    </div>
  );
}
