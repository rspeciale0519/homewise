"use client";

import * as Slider from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface PriceRangeSliderProps {
  /** Maximum index (slider operates on stop indices, not raw dollars). */
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  className?: string;
}

/** Two-thumb range slider built on Radix (no crossing / no thumb-reset bugs). */
export function PriceRangeSlider({ max, low, high, onChange, className }: PriceRangeSliderProps) {
  return (
    <Slider.Root
      className={cn("relative flex items-center w-full h-6 touch-none select-none", className)}
      min={0}
      max={max}
      step={1}
      value={[low, high]}
      onValueChange={(vals) => onChange(vals[0] ?? 0, vals[1] ?? max)}
      minStepsBetweenThumbs={0}
    >
      <Slider.Track className="relative h-1.5 grow rounded-full bg-slate-200">
        <Slider.Range className="absolute h-full rounded-full bg-navy-600" />
      </Slider.Track>
      <Slider.Thumb
        aria-label="Minimum price"
        className="block h-4 w-4 rounded-full bg-white border-2 border-slate-600 shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
      />
      <Slider.Thumb
        aria-label="Maximum price"
        className="block h-4 w-4 rounded-full bg-white border-2 border-slate-600 shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
      />
    </Slider.Root>
  );
}
