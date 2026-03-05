import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings — Admin" };

export default async function SettingsPage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-navy-700">Settings</h1>
        <p className="text-sm text-slate-500">Configure site-wide settings and registration wall behavior</p>
      </div>
      <SettingsView />
    </div>
  );
}
