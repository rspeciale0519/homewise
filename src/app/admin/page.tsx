import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { RecentActivity } from "@/components/admin/recent-activity";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [
    totalUsers,
    totalAgents,
    activeAgents,
    totalContacts,
    newContacts,
    totalEvaluations,
    newEvaluations,
    totalBuyers,
    newBuyers,
    activeAlerts,
    recentContacts,
    recentEvaluations,
    recentBuyers,
  ] = await Promise.all([
    prisma.userProfile.count(),
    prisma.agent.count(),
    prisma.agent.count({ where: { active: true } }),
    prisma.contactSubmission.count(),
    prisma.contactSubmission.count({ where: { status: "new" } }),
    prisma.homeEvaluation.count(),
    prisma.homeEvaluation.count({ where: { status: "new" } }),
    prisma.buyerRequest.count(),
    prisma.buyerRequest.count({ where: { status: "new" } }),
    prisma.propertyAlert.count({ where: { active: true } }),
    prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.homeEvaluation.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.buyerRequest.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const totalSubmissions = totalContacts + totalEvaluations + totalBuyers;
  const newSubmissions = newContacts + newEvaluations + newBuyers;

  const activityItems = [
    ...recentContacts.map((s) => ({
      id: s.id,
      type: "contact" as const,
      name: s.name,
      email: s.email,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })),
    ...recentEvaluations.map((s) => ({
      id: s.id,
      type: "evaluation" as const,
      name: s.name,
      email: s.email,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })),
    ...recentBuyers.map((s) => ({
      id: s.id,
      type: "buyer" as const,
      name: s.name,
      email: s.email,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Admin Dashboard
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Overview of site activity and management.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total Users"
          value={totalUsers}
          href="/admin/users"
          accent="navy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatCard
          label="Agents"
          value={activeAgents}
          subValue={activeAgents !== totalAgents ? `${totalAgents} total` : undefined}
          href="/admin/agents"
          accent="crimson"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        />
        <StatCard
          label="Submissions"
          value={totalSubmissions}
          subValue={newSubmissions > 0 ? `${newSubmissions} new` : undefined}
          href="/admin/submissions"
          accent="gold"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3M2.25 18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V6A2.25 2.25 0 0019.5 3.75H4.5A2.25 2.25 0 002.25 6v12z" />
            </svg>
          }
        />
        <StatCard
          label="Active Alerts"
          value={activeAlerts}
          href="/admin/alerts"
          accent="navy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          }
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-navy-700">Recent Activity</h2>
          <p className="text-xs text-slate-400 mt-0.5">Latest form submissions across all types</p>
        </div>
        <RecentActivity items={activityItems} />
      </div>
    </div>
  );
}
