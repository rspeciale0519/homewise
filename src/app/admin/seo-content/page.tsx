import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { SeoContentView } from "./seo-content-view";

export const metadata: Metadata = { title: "SEO Content — Admin" };

export default async function SeoContentPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">SEO Content Management</h1>
      <p className="text-slate-500 text-sm mb-8">Manage AI-generated neighborhood guides and market content</p>
      <SeoContentView />
    </div>
  );
}
