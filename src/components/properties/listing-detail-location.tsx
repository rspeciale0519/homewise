import type { Property } from "@/providers/property-provider";
import type { SchoolInfo } from "@/lib/great-schools";
import { WalkScoreDisplay } from "./walk-score-display";
import { SchoolRatings } from "./school-ratings";
import { ListingLocationMap } from "./listing-location-map";

interface ListingDetailLocationProps {
  property: Property;
  schools: SchoolInfo[] | null;
}

export function ListingDetailLocation({ property, schools }: ListingDetailLocationProps) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Location</h2>
        <ListingLocationMap
          latitude={property.latitude}
          longitude={property.longitude}
          address={property.address}
          city={property.city}
          state={property.state}
          zip={property.zip}
        />
      </div>

      {/* Walk Score */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-2">Walkability & Transportation</h2>
        <p className="text-sm text-slate-600 mb-6">Understand how walkable this neighborhood is and what transportation options are available. These scores help you evaluate the convenience and lifestyle of the area.</p>
        <WalkScoreDisplay
          walkScore={property.walkScore ?? null}
          walkScoreDescription={property.walkScoreDescription ?? null}
          transitScore={property.transitScore ?? null}
          transitScoreDescription={property.transitScoreDescription ?? null}
          bikeScore={property.bikeScore ?? null}
          bikeScoreDescription={property.bikeScoreDescription ?? null}
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
