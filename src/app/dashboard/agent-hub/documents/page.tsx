import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { DocumentTabs } from "./document-tabs";
import type {
  DocumentSection,
  LibraryCategory,
  LibraryDocument,
  LibrarySection,
} from "@/types/document-library";

const SECTION_ORDER: Array<{ key: DocumentSection; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
];

const VIEWABLE_EXTENSIONS = [".pdf"];

function isViewable(doc: {
  external: boolean;
  url: string | null;
  storageKey: string | null;
}): boolean {
  if (doc.external) return false;
  const ext = (doc.storageKey ?? doc.url ?? "").toLowerCase();
  return VIEWABLE_EXTENSIONS.some((e) => ext.endsWith(e));
}

export default async function DocumentLibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "agent" && profile?.role !== "admin") {
    return <AccessDenied />;
  }

  const categories = await prisma.documentCategory.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    include: {
      documents: {
        orderBy: { sortOrder: "asc" },
        include: {
          document: true,
        },
      },
    },
  });

  const tabs: LibrarySection[] = SECTION_ORDER.map(({ key, label }) => {
    const sectionCategories: LibraryCategory[] = categories
      .filter((c) => c.section === key)
      .map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        documents: c.documents
          .filter((m) => m.document.published)
          .map((m): LibraryDocument => ({
            id: m.document.id,
            slug: m.document.slug,
            name: m.document.name,
            description: m.document.description,
            external: m.document.external,
            url: m.document.url,
            storageKey: m.document.storageKey,
            storageProvider: m.document.storageProvider,
            viewable: isViewable({
              external: m.document.external,
              url: m.document.url,
              storageKey: m.document.storageKey,
            }),
          })),
      }))
      .filter((c) => c.documents.length > 0);

    const count = sectionCategories.reduce(
      (sum, c) => sum + c.documents.length,
      0,
    );

    return { label, key, count, categories: sectionCategories };
  });

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/dashboard/agent-hub" className="hover:text-navy-600 transition-colors">
            Resources Hub
          </Link>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-500">Document Library</span>
        </div>
        <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
          Document Library
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          All company forms and documents organized by category.
        </p>
      </div>

      <DocumentTabs tabs={tabs} />
    </div>
  );
}
