import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import type { Listing } from "@prisma/client";

interface AgentListingsWidgetProps {
  mlsAgentId: string;
  agentSlug: string;
  limit?: number;
}

export async function AgentListingsWidget({ mlsAgentId, agentSlug, limit = 6 }: AgentListingsWidgetProps) {
  const [activeListings, soldListings, activeTotal, soldTotal] = await Promise.all([
    prisma.listing.findMany({
      where: { listingAgentMlsId: mlsAgentId, status: { in: ["Active", "Pending"] } },
      orderBy: { price: "desc" },
      take: limit,
    }),
    prisma.listing.findMany({
      where: { listingAgentMlsId: mlsAgentId, status: "Sold" },
      orderBy: { closeDate: "desc" },
      take: 3,
    }),
    prisma.listing.count({
      where: { listingAgentMlsId: mlsAgentId, status: { in: ["Active", "Pending"] } },
    }),
    prisma.listing.count({
      where: { listingAgentMlsId: mlsAgentId, status: "Sold" },
    }),
  ]);

  if (activeListings.length === 0 && soldListings.length === 0) return null;

  return (
    <div className="space-y-10">
      {activeListings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl font-semibold text-navy-700">Active Listings</h2>
            {activeTotal > limit && (
              <Link
                href={`/agents/${agentSlug}/listings`}
                className="text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors"
              >
                View all {activeTotal} listings →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeListings.map((listing) => (
              <ListingCardSmall key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}

      {soldListings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl font-semibold text-navy-700">Recently Sold</h2>
            {soldTotal > 3 && (
              <Link
                href={`/agents/${agentSlug}/listings?status=sold`}
                className="text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors"
              >
                View all {soldTotal} sold →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {soldListings.map((listing) => (
              <ListingCardSmall key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingCardSmall({ listing }: { listing: Listing }) {
  const statusColor =
    listing.status === "Sold" ? "bg-slate-700 text-white" :
    listing.status === "Pending" ? "bg-amber-500 text-white" :
    "bg-green-600 text-white";
  const statusLabel = listing.status === "Pending" ? "Under Contract" : listing.status;

  return (
    <Link
      href={`/properties/${listing.id}`}
      className="group bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden hover:shadow-elevated transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {listing.imageUrl && (
          <Image
            src={listing.imageUrl}
            alt={listing.address}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      <div className="p-4">
        <p className="font-serif text-lg font-bold text-navy-700 group-hover:text-crimson-600 transition-colors">
          {formatPrice(listing.closePrice ?? listing.price)}
        </p>
        {listing.status === "Sold" && listing.closePrice && (
          <p className="text-xs text-slate-400 line-through">{formatPrice(listing.price)}</p>
        )}
        <p className="text-sm text-slate-600 truncate">{listing.address}</p>
        <p className="text-xs text-slate-400">{listing.city}, {listing.state} {listing.zip}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          <span>{listing.beds} bd</span>
          <span>{listing.baths} ba</span>
          <span>{listing.sqft.toLocaleString()} sqft</span>
        </div>
      </div>
    </Link>
  );
}
