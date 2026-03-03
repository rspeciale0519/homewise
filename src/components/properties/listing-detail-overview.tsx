import type { Property } from "@/providers/property-provider";
import { formatPrice } from "@/lib/format";

interface ListingDetailOverviewProps {
  property: Property;
}

export function ListingDetailOverview({ property }: ListingDetailOverviewProps) {
  const description = property.description ??
    `Welcome to ${property.address} in ${property.city}, FL — a beautifully maintained ${property.sqft.toLocaleString()} square foot ${property.propertyType.toLowerCase()} offering ${property.beds} bedrooms and ${property.baths} bathrooms. This property is currently listed at ${formatPrice(property.price)} and has been on the market for ${property.daysOnMarket} days.`;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
      <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Property Overview</h2>
      <p className="text-slate-600 leading-relaxed mb-6">{description}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <DetailItem label="Property Type" value={property.propertyType} />
        <DetailItem label="Bedrooms" value={`${property.beds}`} />
        <DetailItem label="Bathrooms" value={`${property.baths}`} />
        <DetailItem label="Square Feet" value={property.sqft.toLocaleString()} />
        <DetailItem label="Garage Spaces" value={`${property.garage}`} />
        <DetailItem label="Days on Market" value={`${property.daysOnMarket}`} />
        <DetailItem label="Status" value={property.status} />
        {property.yearBuilt && <DetailItem label="Year Built" value={`${property.yearBuilt}`} />}
        {property.lotSize && <DetailItem label="Lot Size" value={`${property.lotSize} acres`} />}
        {property.hoaFee !== undefined && property.hoaFee !== null && (
          <DetailItem label="HOA Fee" value={`$${property.hoaFee}${property.hoaFrequency ? `/${property.hoaFrequency}` : "/mo"}`} />
        )}
        {property.taxAmount && (
          <DetailItem label="Annual Tax" value={formatPrice(property.taxAmount)} />
        )}
        <DetailItem label="City" value={property.city} />
        <DetailItem label="Zip Code" value={property.zip} />
      </div>

      {/* Amenity tags */}
      {(property.hasPool || property.hasWaterfront || property.hasGarage || property.isNewConstruction || property.hasGatedCommunity) && (
        <div className="flex flex-wrap gap-2 mt-6">
          {property.hasPool && <AmenityTag label="Pool" />}
          {property.hasWaterfront && <AmenityTag label="Waterfront" />}
          {property.hasGarage && <AmenityTag label="Garage" />}
          {property.isNewConstruction && <AmenityTag label="New Construction" />}
          {property.hasGatedCommunity && <AmenityTag label="Gated Community" />}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream-50 rounded-xl p-3.5">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-navy-700">{value}</p>
    </div>
  );
}

function AmenityTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-navy-50 text-xs font-medium text-navy-700">
      <svg className="h-3 w-3 text-navy-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {label}
    </span>
  );
}
