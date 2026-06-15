"use client";

import { cn } from "@/lib/utils";

interface PriceRangeSliderProps {
  /** Maximum index (slider operates on stop indices, not raw dollars). */
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  className?: string;
}

/**
 * Dual-thumb range slider built from two overlaid native range inputs.
 * The inputs are pointer-events:none; only their thumbs are interactive
 * (see `.range-thumb` rules in globals.css), so both handles stay grabbable.
 */
export function PriceRangeSlider({ max, low, high, onChange, className }: PriceRangeSliderProps) {
  const pct = (v: number) => (max === 0 ? 0 : (v / max) * 100);

  return (
    <div className={cn("relative h-6 w-full", className)}>
      <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-full rounded-full bg-slate-200" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-navy-600"
        style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
      />
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={low}
        aria-label="Minimum price"
        onChange={(e) => onChange(Math.min(Number(e.target.value), high), high)}
        className="range-thumb absolute top-0 left-0 h-6 w-full appearance-none bg-transparent"
        style={{ zIndex: low >= max ? 5 : 3 }}
      />
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={high}
        aria-label="Maximum price"
        onChange={(e) => onChange(low, Math.max(Number(e.target.value), low))}
        className="range-thumb absolute top-0 left-0 h-6 w-full appearance-none bg-transparent"
        style={{ zIndex: 4 }}
      />
    </div>
  );
}
