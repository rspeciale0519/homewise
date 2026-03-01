import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SavedSearchList } from "./saved-search-list";

export default async function SavedSearchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const searches = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-display-sm text-navy-700">Saved Searches</h1>
          <p className="mt-2 text-sm text-slate-500">
            {searches.length} saved {searches.length === 1 ? "search" : "searches"}
          </p>
        </div>
        {searches.length > 0 && (
          <Link
            href="/properties"
            className="shrink-0 text-sm font-medium text-crimson-600 hover:text-crimson-700 transition-colors"
          >
            New Search
          </Link>
        )}
      </div>

      {searches.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-navy-50 flex items-center justify-center">
            <svg className="h-8 w-8 text-navy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h2 className="font-serif text-lg font-semibold text-navy-700 mb-2">No saved searches</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Search for properties with filters, then save your criteria to quickly re-run later.
          </p>
          <Link
            href="/properties"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors shadow-sm"
          >
            Search Properties
          </Link>
        </div>
      ) : (
        <SavedSearchList
          searches={searches.map((s) => ({
            ...s,
            filters: s.filters as Record<string, unknown>,
          }))}
        />
      )}
    </div>
  );
}
