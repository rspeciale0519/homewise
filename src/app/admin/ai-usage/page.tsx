import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { AiUsageView } from "./ai-usage-view";

export const metadata: Metadata = { title: "AI Usage — Admin" };

export default async function AiUsagePage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-navy-700">AI Usage Monitoring</h1>
        <p className="text-sm text-slate-500">Track AI feature usage, token consumption, and estimated costs</p>
      </div>
      <AiUsageView />
    </div>
  );
}
