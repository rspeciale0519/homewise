"use client";

import { InlineInput } from "./currency-slider";

interface MonthSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  id: string;
}

export function MonthSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  id,
}: MonthSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium text-navy-700">
          {label}
        </label>
        <InlineInput
          id={id}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          format={(v) => String(Math.round(v))}
          inputWidth="w-[4rem]"
        />
      </div>
      <input
        type="range"
        id={`${id}-range`}
        name={`${id}-range`}
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-crimson-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
