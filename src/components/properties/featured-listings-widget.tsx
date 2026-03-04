import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

interface FeaturedListingsWidgetProps {
  agentMlsId?: string;
  officeMlsId?: string;
  limit?: number;
  title?: string;
}

export async function FeaturedListingsWidget({
  agentMlsId,
  officeMlsId,
  limit = 6,
  title = "Featured Listings",
}: FeaturedListingsWidgetProps) {
  const where: Record<string, unknown> = {
    status: { in: ["Active", "Pending"] },
  };

  if (agentMlsId) where.listingAgentMlsId = agentMlsId;
  if (officeMlsId) where.listingOfficeMlsId = officeMlsId;
  if (!agentMlsId && !officeMlsId) where.featured = true;

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { price: "desc" },
    take: limit,
  });

  if (listings.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
      <h3 className="font-serif text-xl font-semibold text-navy-700 mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/properties/${listing.id}`}
            className="group rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
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
              <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                listing.status === "Pending" ? "bg-amber-500 text-white" : "bg-green-600 text-white"
              }`}>
                {listing.status === "Pending" ? "Under Contract" : listing.status}
              </span>
            </div>
            <div className="p-3">
              <p className="font-serif text-base font-bold text-navy-700 group-hover:text-crimson-600 transition-colors">
                {formatPrice(listing.price)}
              </p>
              <p className="text-sm text-slate-600 truncate">{listing.address}</p>
              <p className="text-xs text-slate-400">{listing.city}, {listing.state} {listing.zip}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
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
