"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { BED_OPTIONS, BATH_OPTIONS, SORT_OPTIONS } from "@/schemas/property-filter.schema";
import { PriceFilter } from "./price-filter";
import { FilterDrawer } from "./filter-drawer";
import { ActiveFilterChips } from "./active-filter-chips";
import { SaveSearchButton } from "./save-search-button";
import { StyledSelect } from "@/components/ui/styled-select";

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
  currentHasPolygon?: boolean;
  totalResults: number;
}

export function SearchFilters(props: SearchFiltersProps) {
  const {
    currentLocation,
    currentMinPrice,
    currentMaxPrice,
    currentBeds,
    currentBaths,
    currentPropertyType,
    currentStatus,
    totalResults,
  } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [locationValue, setLocationValue] = useState(currentLocation ?? "");

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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-6 space-y-4">
      {/* Row 1: Location search */}
      <form onSubmit={handleLocationSubmit} className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by city, address, or zip code..."
          value={locationValue}
          onChange={(e) => setLocationValue(e.target.value)}
          className="w-full h-12 pl-10 pr-24 text-sm bg-slate-50 border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent focus:bg-white transition-all"
        />
        <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 bg-navy-600 text-white text-xs font-semibold tracking-wide rounded-lg hover:bg-navy-700 transition-colors">
          Search
        </button>
      </form>

      {/* Row 2: Quick filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <PriceFilter
          minPrice={currentMinPrice}
          maxPrice={currentMaxPrice}
          onApply={(minPrice, maxPrice) => updateParams({ minPrice, maxPrice })}
        />
        <FilterSelect
          label="Beds"
          placeholderLabel="Any Beds"
          value={currentBeds !== undefined ? String(currentBeds) : ""}
          onChange={(val) => updateParams({ beds: val || undefined })}
          options={BED_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <FilterSelect
          label="Baths"
          placeholderLabel="Any Baths"
          value={currentBaths !== undefined ? String(currentBaths) : ""}
          onChange={(val) => updateParams({ baths: val || undefined })}
          options={BATH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <StyledSelect
          label="Sort By"
          value={props.currentSortBy ?? ""}
          active={Boolean(props.currentSortBy)}
          onChange={(val) => updateParams({ sortBy: val || undefined })}
          options={[
            { value: "", label: "Recommended" },
            ...SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
        <FilterDrawer {...props} onUpdate={updateParams} />
      </div>

      {/* Row 3: Active filter chips */}
      <ActiveFilterChips {...props} onUpdate={updateParams} onClearAll={clearAll} />

      {/* Results count + save */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <p className={cn("text-sm text-slate-500 transition-opacity", isPending && "opacity-50")}>
          <span className="font-semibold text-navy-700">{totalResults.toLocaleString()}</span>{" "}
          {totalResults === 1 ? "property" : "properties"} found
        </p>

        <div className="flex items-center gap-4">
          {hasFilters && <SaveSearchButton />}
          {hasFilters && (
            <button onClick={clearAll} className="text-xs font-medium text-crimson-600 hover:text-crimson-700 transition-colors flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholderLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholderLabel?: string;
}) {
  const renderedOptions = placeholderLabel
    ? options.map((opt) => (opt.value === "" ? { ...opt, label: placeholderLabel } : opt))
    : options;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full h-11 pl-4 pr-9 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all cursor-pointer"
      >
        {renderedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
