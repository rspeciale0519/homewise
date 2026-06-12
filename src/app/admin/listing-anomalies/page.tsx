import { requireAdmin } from "@/lib/admin";
import { ListingAnomaliesPanel } from "@/components/admin/listing-anomalies-panel";

export const metadata = { title: "Listing Anomalies" };

export default async function AdminListingAnomaliesPage() {
  await requireAdmin();

  return (
    <div className="max-w-5xl">
      <h1 className="text-lg font-semibold text-navy-700 mb-1">Listing Anomalies</h1>
      <p className="text-sm text-slate-500 mb-6">
        Daily scan results: sharp price drops, stale listings, possible duplicates, and missing photos.
      </p>
      <ListingAnomaliesPanel />
    </div>
  );
}
