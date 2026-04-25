import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { BackButton } from "@/components/ui/back-button";
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
      <BackButton
        fallbackHref="/admin/billing/agents"
        label="Back to Agent Billing"
        className="mb-6"
      />

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
