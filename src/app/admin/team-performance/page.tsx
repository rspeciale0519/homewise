import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { TeamPerformanceView } from "./team-performance-view";

export const metadata: Metadata = {
  title: "Team Performance — Admin — Homewise FL",
};

export default async function TeamPerformancePage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Team Performance</h1>
      <p className="text-slate-500 text-sm mb-8">Compare agent metrics across your team</p>
      <TeamPerformanceView />
    </div>
  );
}
