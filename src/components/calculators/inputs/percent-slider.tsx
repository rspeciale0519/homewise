"use client";

import { InlineInput } from "./currency-slider";

interface PercentSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  id: string;
  decimals?: number;
  secondaryValue?: string;
}

export function PercentSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  id,
  decimals = 3,
  secondaryValue,
}: PercentSliderProps) {
  const formatPercent = (v: number): string => `${v.toFixed(decimals)}%`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium text-navy-700">
          {label}
        </label>
        <span className="flex items-center gap-1.5">
          <InlineInput
            id={id}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            format={formatPercent}
            inputWidth="w-[5rem]"
          />
          {secondaryValue && (
            <span className="text-xs text-slate-400 font-normal">{secondaryValue}</span>
          )}
        </span>
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
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}
