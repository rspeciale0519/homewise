import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { JobsView } from "./jobs-view";

export const metadata: Metadata = { title: "Background Jobs — Admin" };

export default async function JobsPage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-navy-700">Background Jobs</h1>
        <p className="text-sm text-slate-500">Monitor Inngest-powered background automations and scheduled tasks</p>
      </div>
      <JobsView />
    </div>
  );
}
