import { ListingCard } from "./listing-card";
import type { Property } from "@/providers/property-provider";

interface ListingGridProps {
  properties: Property[];
}

export function ListingGrid({ properties }: ListingGridProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
          <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="font-serif text-xl font-semibold text-navy-700 mb-2">No Properties Found</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Try adjusting your search filters or broadening your criteria to see more results.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
      {properties.map((property) => (
        <ListingCard key={property.id} property={property} />
      ))}
    </div>
  );
}
