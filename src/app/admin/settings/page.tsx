import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings — Admin" };

export default async function SettingsPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Settings</h1>
      <p className="text-slate-500 text-sm mb-8">Configure site-wide settings and registration wall behavior</p>
      <SettingsView />
    </div>
  );
}
