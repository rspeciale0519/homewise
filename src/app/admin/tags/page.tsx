import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { TagsView } from "./tags-view";

export const metadata: Metadata = { title: "Tags — Admin" };

export default async function TagsPage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-navy-700">Tag Management</h1>
        <p className="text-sm text-slate-500">Create, edit, and organize contact tags</p>
      </div>
      <TagsView />
    </div>
  );
}
