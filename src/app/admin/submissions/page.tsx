import { requireAdmin } from "@/lib/admin";
import { SubmissionTable } from "@/components/admin/submission-table";

export default async function AdminSubmissionsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Submissions
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        View and manage form submissions from the public site.
      </p>

      <SubmissionTable />
    </div>
  );
}
