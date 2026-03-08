import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { JobsView } from "./jobs-view";

export const metadata: Metadata = { title: "Background Jobs — Admin" };

export default async function JobsPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Background Jobs</h1>
      <p className="text-slate-500 text-sm mb-8">Monitor Inngest-powered background automations and scheduled tasks</p>
      <JobsView />
    </div>
  );
}
