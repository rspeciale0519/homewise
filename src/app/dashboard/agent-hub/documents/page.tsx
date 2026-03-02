import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import {
  OFFICE_FORMS,
  LISTING_FORMS,
  SALES_FORMS,
} from "@/data/content/agent-resources";
import { DocumentTabs } from "./document-tabs";

export default async function DocumentLibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "agent") {
    return <AccessDenied />;
  }

  const tabs = [
    {
      label: "Office",
      count: OFFICE_FORMS.reduce((acc, c) => acc + c.documents.length, 0),
      categories: OFFICE_FORMS,
    },
    {
      label: "Listing",
      count: LISTING_FORMS.reduce((acc, c) => acc + c.documents.length, 0),
      categories: LISTING_FORMS,
    },
    {
      label: "Sales",
      count: SALES_FORMS.reduce((acc, c) => acc + c.documents.length, 0),
      categories: SALES_FORMS,
    },
  ];

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl">
      {/* Header */}
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

      {/* Tabbed document browser */}
      <DocumentTabs tabs={tabs} />
    </div>
  );
}
