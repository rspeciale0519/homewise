import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { AiUsageView } from "./ai-usage-view";

export const metadata: Metadata = { title: "AI Usage — Admin" };

export default async function AiUsagePage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">AI Usage Monitoring</h1>
      <p className="text-slate-500 text-sm mb-8">Track AI feature usage, token consumption, and estimated costs</p>
      <AiUsageView />
    </div>
  );
}
