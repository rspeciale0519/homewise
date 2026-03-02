import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AgentManagementTable } from "@/components/admin/agent-management-table";

export default async function AdminAgentsPage() {
  await requireAdmin();

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      orderBy: { lastName: "asc" },
      take: 20,
    }),
    prisma.agent.count(),
  ]);

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Agents
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Manage agent profiles and directory listings.
      </p>

      <AgentManagementTable
        initialAgents={JSON.parse(JSON.stringify(agents))}
        initialTotal={total}
      />
    </div>
  );
}
