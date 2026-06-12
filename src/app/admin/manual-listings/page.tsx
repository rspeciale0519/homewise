import { requireAdmin } from "@/lib/admin";
import { ManualListingsQueue } from "@/components/admin/manual-listings-queue";

export const metadata = { title: "Exclusive Listings" };

export default async function AdminManualListingsPage() {
  await requireAdmin();

  return (
    <div className="max-w-5xl">
      <h1 className="text-lg font-semibold text-navy-700 mb-1">Exclusive Listings</h1>
      <p className="text-sm text-slate-500 mb-6">
        Agent-submitted off-market listings. Approved listings appear publicly with an Exclusive badge.
      </p>
      <ManualListingsQueue />
    </div>
  );
}
