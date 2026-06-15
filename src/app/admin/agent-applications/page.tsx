import { requireAdmin } from "@/lib/admin";
import { AgentApplicationTable } from "@/components/admin/agent-application-table";

export default async function AdminAgentApplicationsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Agent Applications
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Review and approve prospective HomeWise Agents. Approving an applicant creates their
        agent profile and emails them a registration link.
      </p>

      <AgentApplicationTable />
    </div>
  );
}
