"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  PROPERTY_TYPES,
  LISTING_STATUSES,
} from "@/schemas/property-filter.schema";
import { CommuteFilter } from "./commute-filter";

interface FilterDrawerProps {
  currentPropertyType?: string;
  currentStatus?: string;
  currentMaxDom?: number;
  currentOpenHousesOnly?: boolean;
  currentMinYearBuilt?: number;
  currentMaxYearBuilt?: number;
  currentMinLotSize?: number;
  currentMaxLotSize?: number;
  currentMaxHoa?: number;
  currentHasPool?: boolean;
  currentHasWaterfront?: boolean;
  currentHasGarage?: boolean;
  currentIsNewConstruction?: boolean;
  currentHasGatedCommunity?: boolean;
  currentSchoolDistrict?: string;
  currentHasPolygon?: boolean;
  totalResults: number;
  onUpdate: (updates: Record<string, string | undefined>) => void;
}

const ADVANCED_KEYS = [
  "propertyType", "status", "maxDom", "openHousesOnly",
  "minYearBuilt", "maxYearBuilt", "minLotSize", "maxLotSize", "maxHoa",
  "hasPool", "hasWaterfront", "hasGarage", "isNewConstruction",
  "hasGatedCommunity", "schoolDistrict", "north", "south", "east", "west", "polygon",
];

export function FilterDrawer(props: FilterDrawerProps) {
  const { totalResults, onUpdate } = props;
  const [open, setOpen] = useState(false);

  const activeCount = [
    props.currentPropertyType, props.currentStatus, props.currentMaxDom,
    props.currentOpenHousesOnly, props.currentMinYearBuilt, props.currentMaxYearBuilt,
    props.currentMinLotSize, props.currentMaxLotSize, props.currentMaxHoa,
    props.currentHasPool, props.currentHasWaterfront, props.currentHasGarage,
    props.currentIsNewConstruction, props.currentHasGatedCommunity,
    props.currentSchoolDistrict, props.currentHasPolygon,
  ].filter((v) => v !== undefined && v !== false).length;

  const resetAll = () => {
    const cleared: Record<string, string | undefined> = {};
    for (const k of ADVANCED_KEYS) cleared[k] = undefined;
    onUpdate(cleared);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "h-11 px-4 text-sm font-medium rounded-xl border transition-all flex items-center justify-center gap-2",
            activeCount > 0
              ? "bg-navy-50 border-navy-200 text-navy-700"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.879a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          More Filters
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-crimson-600 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col focus:outline-none duration-300 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <Dialog.Title className="font-serif text-lg font-semibold text-navy-700">More Filters</Dialog.Title>
            <Dialog.Close className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" aria-label="Close">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
            <Section title="Listing">
              <div className="grid grid-cols-2 gap-3">
                <Select label="Property Type" value={props.currentPropertyType ?? ""} onChange={(v) => onUpdate({ propertyType: v || undefined })}
                  options={[{ value: "", label: "All Types" }, ...PROPERTY_TYPES.map((t) => ({ value: t, label: t }))]} />
                <Select label="Status" value={props.currentStatus ?? ""} onChange={(v) => onUpdate({ status: v || undefined })}
                  options={[{ value: "", label: "All Statuses" }, ...LISTING_STATUSES.map((s) => ({ value: s, label: s }))]} />
                <NumberField label="Max Days on Market" placeholder="e.g. 30" value={props.currentMaxDom} onChange={(v) => onUpdate({ maxDom: v })} />
                <div className="flex items-end">
                  <ToggleChip className="h-10 w-full" label="Open Houses Only" checked={props.currentOpenHousesOnly} onChange={(v) => onUpdate({ openHousesOnly: v ? "true" : undefined })} />
                </div>
              </div>
            </Section>

            <Section title="Home Details">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Min Year Built" placeholder="e.g. 2000" value={props.currentMinYearBuilt} onChange={(v) => onUpdate({ minYearBuilt: v })} />
                <NumberField label="Max Year Built" placeholder="e.g. 2024" value={props.currentMaxYearBuilt} onChange={(v) => onUpdate({ maxYearBuilt: v })} />
                <NumberField label="Min Lot (acres)" placeholder="e.g. 0.25" value={props.currentMinLotSize} onChange={(v) => onUpdate({ minLotSize: v })} />
                <NumberField label="Max Lot (acres)" placeholder="e.g. 5" value={props.currentMaxLotSize} onChange={(v) => onUpdate({ maxLotSize: v })} />
              </div>
            </Section>

            <Section title="Cost">
              <NumberField label="Max HOA / month" placeholder="e.g. 300" value={props.currentMaxHoa} onChange={(v) => onUpdate({ maxHoa: v })} />
            </Section>

            <Section title="Features">
              <div className="flex flex-wrap gap-2">
                <ToggleChip label="Pool" checked={props.currentHasPool} onChange={(v) => onUpdate({ hasPool: v ? "true" : undefined })} />
                <ToggleChip label="Waterfront" checked={props.currentHasWaterfront} onChange={(v) => onUpdate({ hasWaterfront: v ? "true" : undefined })} />
                <ToggleChip label="Garage" checked={props.currentHasGarage} onChange={(v) => onUpdate({ hasGarage: v ? "true" : undefined })} />
                <ToggleChip label="New Construction" checked={props.currentIsNewConstruction} onChange={(v) => onUpdate({ isNewConstruction: v ? "true" : undefined })} />
                <ToggleChip label="Gated" checked={props.currentHasGatedCommunity} onChange={(v) => onUpdate({ hasGatedCommunity: v ? "true" : undefined })} />
              </div>
            </Section>

            <Section title="Location">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">School District</label>
                <input type="text" placeholder="e.g. Orange County" value={props.currentSchoolDistrict ?? ""}
                  onChange={(e) => onUpdate({ schoolDistrict: e.target.value || undefined })}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent" />
              </div>
              <CommuteFilter active={Boolean(props.currentHasPolygon)} onUpdate={onUpdate} />
            </Section>
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100">
            <button type="button" onClick={resetAll} className="text-sm font-medium text-slate-500 hover:text-crimson-600 transition-colors">
              Reset all
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 px-6 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors">
              Show {totalResults.toLocaleString()} {totalResults === 1 ? "home" : "homes"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 pl-3 pr-8 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="absolute right-2.5 bottom-3 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
}

function NumberField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value?: number; onChange: (v: string | undefined) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type="number" inputMode="numeric" placeholder={placeholder} value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent" />
    </div>
  );
}

function ToggleChip({ label, checked, onChange, className }: { label: string; checked?: boolean; onChange: (checked: boolean) => void; className?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center justify-center px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
        checked ? "bg-navy-600 border-navy-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-navy-300",
        className
      )}>
      {label}
    </button>
  );
}
