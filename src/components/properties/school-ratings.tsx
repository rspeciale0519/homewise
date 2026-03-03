import type { SchoolInfo } from "@/lib/great-schools";
import { cn } from "@/lib/utils";

interface SchoolRatingsProps {
  schools: SchoolInfo[] | null;
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
}

export function SchoolRatings({
  schools,
  schoolDistrict,
  elementarySchool,
  middleSchool,
  highSchool,
}: SchoolRatingsProps) {
  const hasApiData = schools && schools.length > 0;
  const hasListingData = elementarySchool || middleSchool || highSchool;

  if (!hasApiData && !hasListingData) {
    return <p className="text-sm text-slate-400 italic">School data unavailable for this location.</p>;
  }

  if (hasApiData) {
    const grouped = {
      elementary: schools.filter((s) => s.type === "elementary"),
      middle: schools.filter((s) => s.type === "middle"),
      high: schools.filter((s) => s.type === "high"),
    };

    return (
      <div className="space-y-4">
        {schoolDistrict && (
          <p className="text-xs font-medium text-slate-500">District: {schoolDistrict}</p>
        )}
        {(["elementary", "middle", "high"] as const).map((type) => {
          const list = grouped[type];
          if (list.length === 0) return null;
          return (
            <div key={type}>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {type === "elementary" ? "Elementary" : type === "middle" ? "Middle" : "High"} Schools
              </h4>
              <div className="space-y-2">
                {list.map((school) => (
                  <SchoolRow key={school.name} school={school} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schoolDistrict && <p className="text-xs font-medium text-slate-500">District: {schoolDistrict}</p>}
      {elementarySchool && <SchoolName label="Elementary" name={elementarySchool} />}
      {middleSchool && <SchoolName label="Middle" name={middleSchool} />}
      {highSchool && <SchoolName label="High" name={highSchool} />}
    </div>
  );
}

function SchoolRow({ school }: { school: SchoolInfo }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-navy-700">{school.name}</p>
        <p className="text-xs text-slate-400">{school.distance.toFixed(1)} mi away</p>
      </div>
      {school.rating !== null && (
        <RatingDots rating={school.rating} />
      )}
    </div>
  );
}

function RatingDots({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full",
            i < rating ? "bg-navy-600" : "bg-slate-200"
          )}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-navy-700">{rating}/10</span>
    </div>
  );
}

function SchoolName({ label, name }: { label: string; name: string }) {
  return (
    <div className="py-2 px-3 bg-cream-50 rounded-lg">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-navy-700">{name}</p>
    </div>
  );
}
