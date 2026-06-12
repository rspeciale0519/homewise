import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import { viewsSince } from "@/lib/listing-views";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Listing Performance" };

export default async function ListingPerformancePage() {
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

  const agent = await prisma.agent.findFirst({
    where: { OR: [{ userId: user.id }, ...(user.email ? [{ email: user.email }] : [])] },
    select: { id: true, mlsAgentId: true },
  });
  const mlsAgentId = normalizeMlsAgentId(agent?.mlsAgentId);

  const listings = agent
    ? await prisma.listing.findMany({
        where: {
          OR: [
            ...(mlsAgentId ? [{ listingAgentMlsId: mlsAgentId }] : []),
            { createdByAgentId: agent.id },
          ],
          status: { in: ["Active", "Pending"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: { id: true, address: true, city: true, price: true, status: true, mlsSource: true },
      })
    : [];

  const listingIds = listings.map((listing) => listing.id);
  const [views, favorites, rsvps, matches] = await Promise.all([
    viewsSince(listingIds, 30),
    listingIds.length
      ? prisma.favoriteProperty.groupBy({
          by: ["propertyId"],
          where: { propertyId: { in: listingIds } },
          _count: true,
        })
      : Promise.resolve([]),
    listingIds.length
      ? prisma.openHouseRsvp.groupBy({
          by: ["listingId"],
          where: { listingId: { in: listingIds } },
          _count: true,
        })
      : Promise.resolve([]),
    agent
      ? prisma.clientListingMatch.findMany({
          where: { agentId: agent.id, dismissed: false },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            createdAt: true,
            contact: { select: { firstName: true, lastName: true, email: true } },
            listing: { select: { id: true, address: true, city: true, price: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const favoriteCounts = new Map(favorites.map((f) => [f.propertyId, f._count]));
  const rsvpCounts = new Map(rsvps.map((r) => [r.listingId, r._count]));

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-navy-700 mb-1">Listing Performance</h1>
        <p className="text-sm text-slate-500 mb-6">
          Views, saves, and RSVPs across your active and pending listings (last 30 days of views).
        </p>

        {listings.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-sm text-slate-500">
            No listings matched to your profile yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Listing</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Views (30d)</th>
                  <th className="px-5 py-3 text-right">Saves</th>
                  <th className="px-5 py-3 text-right">RSVPs</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/properties/${listing.id}`} className="text-navy-700 hover:text-crimson-600 transition-colors">
                        {listing.address}, {listing.city}
                      </Link>
                      {listing.mlsSource === "manual" && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-crimson-600">Exclusive</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatPrice(listing.price)}</td>
                    <td className="px-5 py-3 text-slate-600">{listing.status}</td>
                    <td className="px-5 py-3 text-right font-semibold text-navy-700">{views.get(listing.id) ?? 0}</td>
                    <td className="px-5 py-3 text-right font-semibold text-navy-700">{favoriteCounts.get(listing.id) ?? 0}</td>
                    <td className="px-5 py-3 text-right font-semibold text-navy-700">{rsvpCounts.get(listing.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-navy-700 mb-3">New Matches for Your Clients</h2>
        {matches.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-sm text-slate-500">
            No new matches. Matches appear when newly synced listings fit a client&apos;s saved preferences.
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => (
              <div key={match.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap text-sm">
                <span className="text-slate-600">
                  <span className="font-medium text-navy-700">{match.contact.firstName} {match.contact.lastName}</span>
                  {" "}may like{" "}
                  <Link href={`/properties/${match.listing.id}`} className="font-medium text-navy-700 hover:text-crimson-600 transition-colors">
                    {match.listing.address}, {match.listing.city}
                  </Link>
                  {" "}({formatPrice(match.listing.price)})
                </span>
                <span className="text-xs text-slate-400">
                  {match.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
