import { requireAdmin } from "@/lib/admin";
import { AlertManagementTable } from "@/components/admin/alert-management-table";

export default async function AdminAlertsPage() {
  await requireAdmin();

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Property Alerts
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        View and manage property alert subscriptions.
      </p>

      <AlertManagementTable />
    </div>
  );
}
