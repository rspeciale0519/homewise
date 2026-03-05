import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { TeamPerformanceView } from "./team-performance-view";

export const metadata: Metadata = {
  title: "Team Performance — Admin — Homewise FL",
};

export default async function TeamPerformancePage() {
  await requireAdmin();
  return <TeamPerformanceView />;
}
