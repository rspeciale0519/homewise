import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/properties/favorite-button";
import type { Property } from "@/providers/property-provider";
import { formatPrice } from "@/lib/format";

interface ListingCardProps {
  property: Property;
  isFavorited?: boolean;
  showFavorite?: boolean;
}

const statusVariant: Record<string, "success" | "crimson" | "gold"> = {
  "For Sale": "success",
  "New Listing": "crimson",
  "Pending": "gold",
};

export function ListingCard({ property, isFavorited = false, showFavorite = true }: ListingCardProps) {
  return (
    <article className="group relative bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={property.imageUrl}
          alt={`${property.address}, ${property.city}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <Badge
            variant={statusVariant[property.status] ?? "default"}
            size="sm"
            className="shadow-sm backdrop-blur-sm"
          >
            {property.status}
          </Badge>
        </div>

        {/* Days on market */}
        {property.daysOnMarket <= 7 && !showFavorite && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-navy-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-crimson-500 animate-pulse" />
              New
            </span>
          </div>
        )}

        {/* Favorite button */}
        {showFavorite && (
          <FavoriteButton propertyId={property.id} isFavorited={isFavorited} />
        )}

        {/* Price overlay on hover */}
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="font-serif text-2xl font-bold text-white drop-shadow-lg">
            {formatPrice(property.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {/* Price (visible when not hovering) */}
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="font-serif text-xl sm:text-2xl font-bold text-navy-700 group-hover:text-crimson-600 transition-colors">
            {formatPrice(property.price)}
          </span>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {property.daysOnMarket}d on market
          </span>
        </div>

        {/* Address */}
        <h3 className="text-sm font-medium text-slate-800 truncate">
          {property.address}
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          {property.city}, {property.state} {property.zip}
        </p>

        {/* Stats bar */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <Stat icon="bed" value={property.beds} label="Beds" />
          <div className="h-4 w-px bg-slate-200" />
          <Stat icon="bath" value={property.baths} label="Baths" />
          <div className="h-4 w-px bg-slate-200" />
          <Stat icon="sqft" value={property.sqft.toLocaleString()} label="Sq Ft" />
          {property.garage > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200" />
              <Stat icon="garage" value={property.garage} label="Garage" />
            </>
          )}
        </div>
      </div>

      {/* Clickable overlay */}
      <Link
        href={`/properties/${property.id}`}
        className="absolute inset-0 z-10"
        aria-label={`View ${property.address}, ${property.city} — ${formatPrice(property.price)}`}
      />
    </article>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <StatIcon type={icon} />
      <span className="font-semibold text-navy-700">{value}</span>
      <span className="hidden sm:inline text-slate-400">{label}</span>
    </div>
  );
}

function StatIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5 text-slate-400";

  switch (type) {
    case "bed":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
        </svg>
      );
    case "bath":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
        </svg>
      );
    case "sqft":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      );
    case "garage":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4" />
        </svg>
      );
    default:
      return null;
  }
}
