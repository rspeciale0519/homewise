"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  PROPERTY_TYPES,
  LISTING_STATUSES,
  BED_OPTIONS,
  BATH_OPTIONS,
  SORT_OPTIONS,
} from "@/schemas/property-filter.schema";
import { SearchFiltersAdvanced } from "./search-filters-advanced";

interface SearchFiltersProps {
  currentLocation?: string;
  currentMinPrice?: number;
  currentMaxPrice?: number;
  currentBeds?: number;
  currentBaths?: number;
  currentPropertyType?: string;
  currentStatus?: string;
  currentSortBy?: string;
  currentMinYearBuilt?: number;
  currentMaxYearBuilt?: number;
  currentMinLotSize?: number;
  currentMaxLotSize?: number;
  currentMaxHoa?: number;
  currentMaxDom?: number;
  currentHasPool?: boolean;
  currentHasWaterfront?: boolean;
  currentHasGarage?: boolean;
  currentIsNewConstruction?: boolean;
  currentHasGatedCommunity?: boolean;
  currentOpenHousesOnly?: boolean;
  currentSchoolDistrict?: string;
  totalResults: number;
}

const PRICE_PRESETS = [
  { label: "Any", min: "", max: "" },
  { label: "Under $300k", min: "0", max: "300000" },
  { label: "$300k – $500k", min: "300000", max: "500000" },
  { label: "$500k – $750k", min: "500000", max: "750000" },
  { label: "$750k+", min: "750000", max: "" },
];

export function SearchFilters({
  currentLocation,
  currentMinPrice,
  currentMaxPrice,
  currentBeds,
  currentBaths,
  currentPropertyType,
  currentStatus,
  currentSortBy,
  currentMinYearBuilt,
  currentMaxYearBuilt,
  currentMinLotSize,
  currentMaxLotSize,
  currentMaxHoa,
  currentMaxDom,
  currentHasPool,
  currentHasWaterfront,
  currentHasGarage,
  currentIsNewConstruction,
  currentHasGatedCommunity,
  currentOpenHousesOnly,
  currentSchoolDistrict,
  totalResults,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [locationValue, setLocationValue] = useState(currentLocation ?? "");
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(currentPropertyType || currentStatus)
  );

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    setLocationValue("");
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ location: locationValue.trim() || undefined });
  };

  const hasFilters =
    currentLocation ||
    currentMinPrice !== undefined ||
    currentMaxPrice !== undefined ||
    currentBeds !== undefined ||
    currentBaths !== undefined ||
    currentPropertyType ||
    currentStatus;

  const currentPriceLabel = PRICE_PRESETS.find(
    (p) =>
      p.min === String(currentMinPrice ?? "") &&
      p.max === String(currentMaxPrice ?? "")
  )?.label;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-6 space-y-4">
      {/* Row 1: Location search */}
      <form onSubmit={handleLocationSubmit} className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search by city, address, or zip code..."
          value={locationValue}
          onChange={(e) => setLocationValue(e.target.value)}
          className="w-full h-12 pl-10 pr-24 text-sm bg-slate-50 border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent focus:bg-white transition-all"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 bg-navy-600 text-white text-xs font-semibold tracking-wide rounded-lg hover:bg-navy-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Row 2: Quick filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Price Range */}
        <FilterSelect
          label="Price"
          value={
            currentMinPrice !== undefined || currentMaxPrice !== undefined
              ? `${currentMinPrice ?? "0"}-${currentMaxPrice ?? ""}`
              : ""
          }
          onChange={(val) => {
            if (!val) {
              updateParams({ minPrice: undefined, maxPrice: undefined });
            } else {
              const [min, max] = val.split("-");
              updateParams({
                minPrice: min || undefined,
                maxPrice: max || undefined,
              });
            }
          }}
          options={PRICE_PRESETS.map((p) => ({
            value: p.min || p.max ? `${p.min}-${p.max}` : "",
            label: p.label,
          }))}
        />

        {/* Beds */}
        <FilterSelect
          label="Beds"
          value={currentBeds !== undefined ? String(currentBeds) : ""}
          onChange={(val) => updateParams({ beds: val || undefined })}
          options={BED_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />

        {/* Baths */}
        <FilterSelect
          label="Baths"
          value={currentBaths !== undefined ? String(currentBaths) : ""}
          onChange={(val) => updateParams({ baths: val || undefined })}
          options={BATH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className={cn(
            "h-11 px-4 text-sm font-medium rounded-xl border transition-all duration-200 flex items-center justify-center gap-2",
            showAdvanced
              ? "bg-navy-50 border-navy-200 text-navy-700"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          )}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          More
          <svg
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              showAdvanced && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Row 3: Advanced filters (collapsible) */}
      {showAdvanced && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FilterSelect
              label="Property Type"
              value={currentPropertyType ?? ""}
              onChange={(val) => updateParams({ propertyType: val || undefined })}
              options={[
                { value: "", label: "All Types" },
                ...PROPERTY_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />
            <FilterSelect
              label="Status"
              value={currentStatus ?? ""}
              onChange={(val) => updateParams({ status: val || undefined })}
              options={[
                { value: "", label: "All Statuses" },
                ...LISTING_STATUSES.map((s) => ({ value: s, label: s })),
              ]}
            />
            <FilterSelect
              label="Sort By"
              value={currentSortBy ?? ""}
              onChange={(val) => updateParams({ sortBy: val || undefined })}
              options={[
                { value: "", label: "Default" },
                ...SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
              ]}
            />
          </div>
          <SearchFiltersAdvanced
            currentMinYearBuilt={currentMinYearBuilt}
            currentMaxYearBuilt={currentMaxYearBuilt}
            currentMinLotSize={currentMinLotSize}
            currentMaxLotSize={currentMaxLotSize}
            currentMaxHoa={currentMaxHoa}
            currentMaxDom={currentMaxDom}
            currentHasPool={currentHasPool}
            currentHasWaterfront={currentHasWaterfront}
            currentHasGarage={currentHasGarage}
            currentIsNewConstruction={currentIsNewConstruction}
            currentHasGatedCommunity={currentHasGatedCommunity}
            currentOpenHousesOnly={currentOpenHousesOnly}
            currentSchoolDistrict={currentSchoolDistrict}
            onUpdate={updateParams}
          />
        </div>
      )}

      {/* Results count + clear */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <p
          className={cn(
            "text-sm text-slate-500 transition-opacity",
            isPending && "opacity-50"
          )}
        >
          <span className="font-semibold text-navy-700">{totalResults}</span>{" "}
          {totalResults === 1 ? "property" : "properties"} found
          {currentPriceLabel && currentPriceLabel !== "Any" && (
            <span className="text-slate-400"> &middot; {currentPriceLabel}</span>
          )}
        </p>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-crimson-600 hover:text-crimson-700 transition-colors flex items-center gap-1"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full h-11 pl-4 pr-9 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );
}
