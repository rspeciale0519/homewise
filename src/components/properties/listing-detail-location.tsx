import type { Property } from "@/providers/property-provider";
import type { SchoolInfo } from "@/lib/great-schools";
import { WalkScoreDisplay } from "./walk-score-display";
import { SchoolRatings } from "./school-ratings";

interface ListingDetailLocationProps {
  property: Property;
  schools: SchoolInfo[] | null;
}

export function ListingDetailLocation({ property, schools }: ListingDetailLocationProps) {
  return (
    <div className="space-y-8">
      {/* Map placeholder */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Location</h2>
        <div className="bg-slate-100 rounded-xl aspect-[16/9] flex items-center justify-center">
          <div className="text-center">
            <svg className="h-12 w-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-slate-500 font-medium">{property.address}</p>
            <p className="text-xs text-slate-400">{property.city}, {property.state} {property.zip}</p>
          </div>
        </div>
      </div>

      {/* Walk Score */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-2">Walkability & Transportation</h2>
        <p className="text-sm text-slate-600 mb-6">Understand how walkable this neighborhood is and what transportation options are available. These scores help you evaluate the convenience and lifestyle of the area.</p>
        <WalkScoreDisplay
          walkScore={property.walkScore ?? null}
          walkScoreDescription={(property as any).walkScoreDescription ?? null}
          transitScore={property.transitScore ?? null}
          transitScoreDescription={(property as any).transitScoreDescription ?? null}
          bikeScore={property.bikeScore ?? null}
          bikeScoreDescription={(property as any).bikeScoreDescription ?? null}
        />
      </div>

      {/* Schools */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Nearby Schools</h2>
        <SchoolRatings
          schools={schools}
          schoolDistrict={property.schoolDistrict}
          elementarySchool={property.elementarySchool}
          middleSchool={property.middleSchool}
          highSchool={property.highSchool}
        />
      </div>
    </div>
  );
}
