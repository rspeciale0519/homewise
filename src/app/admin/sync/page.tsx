import { requireAdmin } from "@/lib/admin";
import { SyncDashboard } from "@/components/admin/sync-dashboard";

export default async function AdminSyncPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        MLS Sync
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Monitor MLS Grid sync status and trigger manual syncs.
      </p>

      <SyncDashboard />
    </div>
  );
}
