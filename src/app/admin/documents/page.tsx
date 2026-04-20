import type { Metadata } from "next";
import { OrganizeView } from "./organize-view";

export const metadata: Metadata = { title: "Document Library — Admin" };

export default async function DocumentsAdminPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Document Library
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Organize what agents see. Drag to reorder within a category, or drag
        across categories within a section.
      </p>
      <OrganizeView />
    </div>
  );
}
