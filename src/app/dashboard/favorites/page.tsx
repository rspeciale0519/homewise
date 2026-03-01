import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FavoritesGrid } from "./favorites-grid";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const favorites = await prisma.favoriteProperty.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: "desc" },
  });

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-display-sm text-navy-700">Favorites</h1>
          <p className="mt-2 text-sm text-slate-500">
            {favorites.length} saved {favorites.length === 1 ? "property" : "properties"}
          </p>
        </div>
        {favorites.length > 0 && (
          <Link
            href="/properties"
            className="shrink-0 text-sm font-medium text-crimson-600 hover:text-crimson-700 transition-colors"
          >
            Browse More
          </Link>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-crimson-50 flex items-center justify-center">
            <svg className="h-8 w-8 text-crimson-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h2 className="font-serif text-lg font-semibold text-navy-700 mb-2">No favorites yet</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Browse properties and tap the heart to save your favorites here.
          </p>
          <Link
            href="/properties"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors shadow-sm"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <FavoritesGrid favorites={favorites} />
      )}
    </div>
  );
}
