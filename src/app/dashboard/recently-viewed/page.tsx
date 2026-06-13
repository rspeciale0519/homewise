import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withIdx } from "@/lib/mls-visibility";
import { formatPrice } from "@/lib/format";

export default async function RecentlyViewedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recentlyViewed = await prisma.recentlyViewed.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: "desc" },
    take: 20,
  });

  const listings = recentlyViewed.length
    ? await prisma.listing.findMany({
        where: withIdx({ id: { in: recentlyViewed.map((r) => r.propertyId) } }),
        select: { id: true, address: true, city: true, state: true, price: true, status: true },
      })
    : [];
  const details = new Map(listings.map((l) => [l.id, l]));

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="mb-8">
        <h1 className="font-serif text-display-sm text-navy-700">Recently Viewed</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your last {recentlyViewed.length} viewed {recentlyViewed.length === 1 ? "property" : "properties"}
        </p>
      </div>

      {recentlyViewed.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-navy-50 flex items-center justify-center">
            <svg className="h-8 w-8 text-navy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-serif text-lg font-semibold text-navy-700 mb-2">No recently viewed properties</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Properties you view will automatically appear here for easy reference.
          </p>
          <Link
            href="/properties"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors shadow-sm"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentlyViewed.map((item) => {
            const detail = details.get(item.propertyId);
            return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-card transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {detail ? (
                    <>
                      <Link
                        href={`/properties/${item.propertyId}`}
                        className="text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors block truncate"
                      >
                        {detail.address}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {detail.city}, {detail.state} · {formatPrice(detail.price)} · {detail.status}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-navy-700">Property {item.propertyId}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Viewed {new Date(item.viewedAt).toLocaleDateString()} at{" "}
                    {new Date(item.viewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Link
                  href={`/properties/${item.propertyId}`}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-navy-600 bg-navy-50 hover:bg-navy-100 transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
