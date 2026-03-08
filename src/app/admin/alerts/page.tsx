import { requireAdmin } from "@/lib/admin";
import { AlertManagementTable } from "@/components/admin/alert-management-table";

export default async function AdminAlertsPage() {
  await requireAdmin();

  return (
    <div>
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
