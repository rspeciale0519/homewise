"use client";

import { priceLabel } from "./price-filter";

interface ActiveFilterChipsProps {
  currentLocation?: string;
  currentMinPrice?: number;
  currentMaxPrice?: number;
  currentBeds?: number;
  currentBaths?: number;
  currentPropertyType?: string;
  currentStatus?: string;
  currentMinYearBuilt?: number;
  currentMaxYearBuilt?: number;
  currentMinLotSize?: number;
  currentMaxLotSize?: number;
  currentMaxHoa?: number;
  currentMaxDom?: number;
  currentSchoolDistrict?: string;
  currentHasPool?: boolean;
  currentHasWaterfront?: boolean;
  currentHasGarage?: boolean;
  currentIsNewConstruction?: boolean;
  currentHasGatedCommunity?: boolean;
  currentOpenHousesOnly?: boolean;
  currentHasPolygon?: boolean;
  onUpdate: (updates: Record<string, string | undefined>) => void;
  onClearAll: () => void;
}

type Chip = { key: string; label: string; clear: Record<string, string | undefined> };

function rangeLabel(prefix: string, min?: number, max?: number, suffix = ""): string {
  if (min !== undefined && max !== undefined) return `${prefix}: ${min}–${max}${suffix}`;
  if (min !== undefined) return `${prefix}: ${min}+${suffix}`;
  return `${prefix}: up to ${max}${suffix}`;
}

export function ActiveFilterChips(props: ActiveFilterChipsProps) {
  const { onUpdate, onClearAll } = props;
  const chips: Chip[] = [];

  if (props.currentLocation) chips.push({ key: "location", label: `“${props.currentLocation}”`, clear: { location: undefined } });
  if (props.currentMinPrice !== undefined || props.currentMaxPrice !== undefined)
    chips.push({ key: "price", label: priceLabel(props.currentMinPrice, props.currentMaxPrice), clear: { minPrice: undefined, maxPrice: undefined } });
  if (props.currentBeds !== undefined) chips.push({ key: "beds", label: `${props.currentBeds}+ Beds`, clear: { beds: undefined } });
  if (props.currentBaths !== undefined) chips.push({ key: "baths", label: `${props.currentBaths}+ Baths`, clear: { baths: undefined } });
  if (props.currentPropertyType) chips.push({ key: "type", label: props.currentPropertyType, clear: { propertyType: undefined } });
  if (props.currentStatus) chips.push({ key: "status", label: props.currentStatus, clear: { status: undefined } });
  if (props.currentMinYearBuilt !== undefined || props.currentMaxYearBuilt !== undefined)
    chips.push({ key: "year", label: rangeLabel("Year", props.currentMinYearBuilt, props.currentMaxYearBuilt), clear: { minYearBuilt: undefined, maxYearBuilt: undefined } });
  if (props.currentMinLotSize !== undefined || props.currentMaxLotSize !== undefined)
    chips.push({ key: "lot", label: rangeLabel("Lot", props.currentMinLotSize, props.currentMaxLotSize, " ac"), clear: { minLotSize: undefined, maxLotSize: undefined } });
  if (props.currentMaxHoa !== undefined) chips.push({ key: "hoa", label: `HOA ≤ $${props.currentMaxHoa}`, clear: { maxHoa: undefined } });
  if (props.currentMaxDom !== undefined) chips.push({ key: "dom", label: `≤ ${props.currentMaxDom} days`, clear: { maxDom: undefined } });
  if (props.currentSchoolDistrict) chips.push({ key: "school", label: props.currentSchoolDistrict, clear: { schoolDistrict: undefined } });
  if (props.currentHasPool) chips.push({ key: "pool", label: "Pool", clear: { hasPool: undefined } });
  if (props.currentHasWaterfront) chips.push({ key: "waterfront", label: "Waterfront", clear: { hasWaterfront: undefined } });
  if (props.currentHasGarage) chips.push({ key: "garage", label: "Garage", clear: { hasGarage: undefined } });
  if (props.currentIsNewConstruction) chips.push({ key: "new", label: "New Construction", clear: { isNewConstruction: undefined } });
  if (props.currentHasGatedCommunity) chips.push({ key: "gated", label: "Gated", clear: { hasGatedCommunity: undefined } });
  if (props.currentOpenHousesOnly) chips.push({ key: "open", label: "Open Houses", clear: { openHousesOnly: undefined } });
  if (props.currentHasPolygon)
    chips.push({ key: "area", label: "Custom Area", clear: { polygon: undefined, north: undefined, south: undefined, east: undefined, west: undefined } });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onUpdate(chip.clear)}
          className="group inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-navy-50 border border-navy-100 text-xs font-medium text-navy-700 hover:bg-navy-100 transition-colors"
        >
          {chip.label}
          <svg className="h-3.5 w-3.5 text-navy-400 group-hover:text-crimson-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onClearAll} className="text-xs font-medium text-crimson-600 hover:text-crimson-700 transition-colors ml-1">
          Clear all
        </button>
      )}
    </div>
  );
}
