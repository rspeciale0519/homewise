"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  id,
  value,
  defaultValue,
  onValueChange,
  name,
  required,
  disabled,
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-crimson-600 ml-1">*</span>}
        </label>
      )}
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        name={name}
        required={required}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={selectId}
          className={cn(
            "flex items-center justify-between w-full h-11 pl-4 pr-10 rounded-md border bg-white text-slate-800 text-sm",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-crimson-500 focus:ring-crimson-500" : "border-slate-200 hover:border-slate-300",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ml-2 transition-transform duration-200 data-[state=open]:rotate-180">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200"
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-white cursor-default">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex items-center px-3 py-2.5 rounded-lg text-sm text-slate-700 cursor-pointer select-none outline-none data-[highlighted]:bg-navy-50 data-[highlighted]:text-navy-700 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3">
                    <svg className="h-4 w-4 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-white cursor-default">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && <p className="mt-1.5 text-xs text-crimson-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
