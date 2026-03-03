import Link from "next/link";
import type { Property } from "@/providers/property-provider";
import { formatPrice } from "@/lib/format";

interface OpenHouseWidgetProps {
  properties: Property[];
}

export function OpenHouseWidget({ properties }: OpenHouseWidgetProps) {
  const withOpenHouse = properties.filter(
    (p) => p.openHouseSchedule && p.openHouseSchedule.length > 0
  );

  if (withOpenHouse.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-crimson-100 flex items-center justify-center">
          <svg className="h-4 w-4 text-crimson-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="font-serif text-lg font-semibold text-navy-700">Open Houses This Weekend</h3>
      </div>
      <div className="space-y-3">
        {withOpenHouse.slice(0, 5).map((property) => {
          const nextSlot = property.openHouseSchedule![0]!;
          return (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-navy-700 group-hover:text-crimson-600 transition-colors">
                  {property.address}
                </p>
                <p className="text-xs text-slate-500">
                  {nextSlot.date} &middot; {nextSlot.startTime}–{nextSlot.endTime}
                </p>
              </div>
              <span className="text-sm font-semibold text-navy-700">{formatPrice(property.price)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
