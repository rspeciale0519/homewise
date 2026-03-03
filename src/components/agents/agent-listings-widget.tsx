import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

interface AgentListingsWidgetProps {
  mlsAgentId: string;
  agentSlug: string;
  limit?: number;
}

export async function AgentListingsWidget({ mlsAgentId, agentSlug, limit = 6 }: AgentListingsWidgetProps) {
  const listings = await prisma.listing.findMany({
    where: { listingAgentMlsId: mlsAgentId, status: { in: ["Active", "Pending"] } },
    orderBy: { price: "desc" },
    take: limit,
  });

  if (listings.length === 0) return null;

  const total = await prisma.listing.count({
    where: { listingAgentMlsId: mlsAgentId, status: { in: ["Active", "Pending"] } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl font-semibold text-navy-700">Active Listings</h2>
        {total > limit && (
          <Link
            href={`/agents/${agentSlug}/listings`}
            className="text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors"
          >
            View all {total} listings →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <Link
            key={listing.id}
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
            </div>
            <div className="p-4">
              <p className="font-serif text-lg font-bold text-navy-700 group-hover:text-crimson-600 transition-colors">
                {formatPrice(listing.price)}
              </p>
              <p className="text-sm text-slate-600 truncate">{listing.address}</p>
              <p className="text-xs text-slate-400">{listing.city}, {listing.state} {listing.zip}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span>{listing.beds} bd</span>
                <span>{listing.baths} ba</span>
                <span>{listing.sqft.toLocaleString()} sqft</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
