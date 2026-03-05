import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { SeoContentView } from "./seo-content-view";

export const metadata: Metadata = { title: "SEO Content — Admin" };

export default async function SeoContentPage() {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-navy-700">SEO Content Management</h1>
        <p className="text-sm text-slate-500">Manage AI-generated neighborhood guides and market content</p>
      </div>
      <SeoContentView />
    </div>
  );
}
