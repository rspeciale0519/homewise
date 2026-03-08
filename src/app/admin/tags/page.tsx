import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { TagsView } from "./tags-view";

export const metadata: Metadata = { title: "Tags — Admin" };

export default async function TagsPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">Tag Management</h1>
      <p className="text-slate-500 text-sm mb-8">Create, edit, and organize contact tags</p>
      <TagsView />
    </div>
  );
}
