import { requireAdmin } from "@/lib/admin";
import { BackButton } from "@/components/ui/back-button";
import { AgentForm } from "@/components/admin/agent-form";

export default async function AdminNewAgentPage() {
  await requireAdmin();

  return (
    <div className="max-w-5xl">
      <BackButton
        fallbackHref="/admin/agents"
        label="Back to Agents"
        className="mb-6"
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h1 className="text-lg font-semibold text-navy-700">Add New Agent</h1>
        </div>
        <div className="px-6 py-5">
          <AgentForm mode="create" />
        </div>
      </div>
    </div>
  );
}
