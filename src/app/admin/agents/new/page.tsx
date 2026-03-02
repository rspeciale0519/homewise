import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AgentForm } from "@/components/admin/agent-form";

export default async function AdminNewAgentPage() {
  await requireAdmin();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <Link
        href="/admin/agents"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Agents
      </Link>

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
