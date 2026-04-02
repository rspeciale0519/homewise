"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface CurrencySliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  id: string;
  minLabel?: string;
  maxLabel?: string;
}

export function CurrencySlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  id,
  minLabel,
  maxLabel,
}: CurrencySliderProps) {
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
          format={formatCurrency}
          inputWidth="w-[8rem]"
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
        <span>{minLabel ?? formatCurrencyShort(min)}</span>
        <span>{maxLabel ?? formatCurrencyShort(max)}</span>
      </div>
    </div>
  );
}

function formatCurrency(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

interface InlineInputProps {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  format: (v: number) => string;
  inputWidth: string;
}

function InlineInput({ id, value, onChange, min, max, format, inputWidth }: InlineInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={ref}
      id={id}
      name={id}
      type="text"
      inputMode="decimal"
      aria-label={id}
      value={isFocused ? draft : format(value)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        setIsFocused(true);
        setDraft(String(value));
        requestAnimationFrame(() => ref.current?.select());
      }}
      onBlur={() => {
        setIsFocused(false);
        const parsed = parseFloat(draft.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed)) {
          onChange(Math.min(max, Math.max(min, parsed)));
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") ref.current?.blur();
        if (e.key === "Escape") {
          setDraft(String(value));
          ref.current?.blur();
        }
      }}
      className={cn(
        "text-sm font-semibold text-navy-700 text-right bg-transparent",
        "rounded-md px-2 py-0.5 -my-0.5",
        "border border-dashed border-slate-200",
        "hover:border-solid hover:border-slate-300 hover:bg-slate-50/80",
        "focus:border-solid focus:border-crimson-500 focus:bg-white focus:outline-none",
        "focus:shadow-[0_0_0_2px_rgba(192,38,55,0.1)]",
        "transition-all duration-150 cursor-text tabular-nums",
        inputWidth
      )}
    />
  );
}

export { InlineInput, formatCurrency, formatCurrencyShort };
