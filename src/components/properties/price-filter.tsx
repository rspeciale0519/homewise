"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PriceRangeSlider } from "./price-range-slider";

const PRICE_STOPS = [
  0, 50_000, 100_000, 150_000, 200_000, 250_000, 300_000, 350_000, 400_000,
  450_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000, 1_250_000,
  1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, Infinity,
];
const LAST = PRICE_STOPS.length - 1;

const PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under $300k", min: null, max: 300_000 },
  { label: "$300k–$500k", min: 300_000, max: 500_000 },
  { label: "$500k–$750k", min: 500_000, max: 750_000 },
  { label: "$750k–$1M", min: 750_000, max: 1_000_000 },
  { label: "$1M+", min: 1_000_000, max: null },
];

function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function priceLabel(min?: number, max?: number): string {
  if (min == null && max == null) return "Any Price";
  if (min != null && max == null) return `${fmtPrice(min)}+`;
  if (min == null && max != null) return `Up to ${fmtPrice(max)}`;
  return `${fmtPrice(min!)} – ${fmtPrice(max!)}`;
}

function nearestIndex(value: number): number {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < PRICE_STOPS.length; i++) {
    const stop = PRICE_STOPS[i];
    if (stop === undefined) continue;
    const diff = Math.abs((stop === Infinity ? 10_000_000 : stop) - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

interface PriceFilterProps {
  minPrice?: number;
  maxPrice?: number;
  onApply: (minPrice?: string, maxPrice?: string) => void;
}

export function PriceFilter({ minPrice, maxPrice, onApply }: PriceFilterProps) {
  const [open, setOpen] = useState(false);
  const [minVal, setMinVal] = useState<number | null>(minPrice ?? null);
  const [maxVal, setMaxVal] = useState<number | null>(maxPrice ?? null);

  // Re-sync staged values with committed props whenever the popover opens.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMinVal(minPrice ?? null);
      setMaxVal(maxPrice ?? null);
    }
    setOpen(next);
  };

  const low = minVal == null ? 0 : nearestIndex(minVal);
  const high = maxVal == null ? LAST : nearestIndex(maxVal);

  const stopToVal = (idx: number): number | null => {
    const s = PRICE_STOPS[idx];
    return s === undefined || s === 0 || s === Infinity ? null : s;
  };

  const onSlide = (lo: number, hi: number) => {
    setMinVal(stopToVal(lo));
    setMaxVal(stopToVal(hi));
  };

  const commit = (min: number | null, max: number | null) => {
    onApply(min != null ? String(min) : undefined, max != null ? String(max) : undefined);
    setOpen(false);
  };

  const isActive = minPrice != null || maxPrice != null;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Price"
          className={cn(
            "w-full h-11 pl-4 pr-9 text-sm rounded-xl border text-left relative transition-all focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent",
            isActive ? "border-navy-300 bg-navy-50 text-navy-700" : "border-slate-200 bg-white text-navy-700"
          )}
        >
          {priceLabel(minPrice, maxPrice)}
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[300px] rounded-2xl border border-slate-100 bg-white p-4 shadow-elevated focus:outline-none"
        >
          <div className="flex flex-wrap gap-1.5 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => commit(p.min, p.max)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-navy-50 hover:text-navy-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-1 text-sm font-medium text-navy-700">{priceLabel(minVal ?? undefined, maxVal ?? undefined)}</div>
          <PriceRangeSlider max={LAST} low={low} high={high} onChange={onSlide} className="mb-4" />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Min</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="No min"
                value={minVal ?? ""}
                onChange={(e) => setMinVal(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Max</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="No max"
                value={maxVal ?? ""}
                onChange={(e) => setMaxVal(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => commit(null, null)}
              className="text-xs font-medium text-slate-500 hover:text-crimson-600 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => commit(minVal, maxVal)}
              className="h-9 px-5 rounded-lg bg-navy-600 text-white text-xs font-semibold hover:bg-navy-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
