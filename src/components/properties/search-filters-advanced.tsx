"use client";

interface SearchFiltersAdvancedProps {
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
  onUpdate: (updates: Record<string, string | undefined>) => void;
}

export function SearchFiltersAdvanced({
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
  onUpdate,
}: SearchFiltersAdvancedProps) {
  return (
    <div className="space-y-4 pt-2">
      {/* Year Built + Lot Size */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumberInput
          label="Min Year"
          placeholder="e.g. 2000"
          value={currentMinYearBuilt}
          onChange={(v) => onUpdate({ minYearBuilt: v })}
        />
        <NumberInput
          label="Max Year"
          placeholder="e.g. 2024"
          value={currentMaxYearBuilt}
          onChange={(v) => onUpdate({ maxYearBuilt: v })}
        />
        <NumberInput
          label="Min Lot (acres)"
          placeholder="e.g. 0.25"
          value={currentMinLotSize}
          onChange={(v) => onUpdate({ minLotSize: v })}
        />
        <NumberInput
          label="Max Lot (acres)"
          placeholder="e.g. 5"
          value={currentMaxLotSize}
          onChange={(v) => onUpdate({ maxLotSize: v })}
        />
      </div>

      {/* HOA + DOM + School District */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput
          label="Max HOA/mo"
          placeholder="e.g. 300"
          value={currentMaxHoa}
          onChange={(v) => onUpdate({ maxHoa: v })}
        />
        <NumberInput
          label="Max Days on Market"
          placeholder="e.g. 30"
          value={currentMaxDom}
          onChange={(v) => onUpdate({ maxDom: v })}
        />
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">School District</label>
          <input
            type="text"
            placeholder="e.g. Orange County"
            value={currentSchoolDistrict ?? ""}
            onChange={(e) => onUpdate({ schoolDistrict: e.target.value || undefined })}
            className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Amenity checkboxes */}
      <div className="flex flex-wrap gap-3">
        <Checkbox label="Pool" checked={currentHasPool} onChange={(v) => onUpdate({ hasPool: v ? "true" : undefined })} />
        <Checkbox label="Waterfront" checked={currentHasWaterfront} onChange={(v) => onUpdate({ hasWaterfront: v ? "true" : undefined })} />
        <Checkbox label="Garage" checked={currentHasGarage} onChange={(v) => onUpdate({ hasGarage: v ? "true" : undefined })} />
        <Checkbox label="New Construction" checked={currentIsNewConstruction} onChange={(v) => onUpdate({ isNewConstruction: v ? "true" : undefined })} />
        <Checkbox label="Gated" checked={currentHasGatedCommunity} onChange={(v) => onUpdate({ hasGatedCommunity: v ? "true" : undefined })} />
        <Checkbox label="Open Houses Only" checked={currentOpenHousesOnly} onChange={(v) => onUpdate({ openHousesOnly: v ? "true" : undefined })} />
      </div>
    </div>
  );
}

function NumberInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value?: number;
  onChange: (val: string | undefined) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
      />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-navy-300 transition-colors">
      <input
        type="checkbox"
        checked={checked ?? false}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500"
      />
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </label>
  );
}
