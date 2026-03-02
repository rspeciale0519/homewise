import { requireAdmin } from "@/lib/admin";

export default async function AdminOverviewPage() {
  await requireAdmin();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Admin Dashboard
      </h1>
      <p className="text-slate-500 text-sm">
        Manage users, agents, submissions, and property alerts.
      </p>
    </div>
  );
}
