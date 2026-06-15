"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface StyledSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  /** Highlight the trigger when a non-default value is selected. */
  active?: boolean;
  className?: string;
}

/** A design-system dropdown (Radix) replacing the native <select> menu. */
export function StyledSelect({ label, value, onChange, options, active, className }: StyledSelectProps) {
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "group w-full h-11 pl-4 pr-9 text-sm rounded-xl border text-left relative transition-all",
            "focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent",
            "data-[state=open]:ring-2 data-[state=open]:ring-navy-600 data-[state=open]:border-transparent",
            active ? "border-navy-300 bg-navy-50 text-navy-700" : "border-slate-200 bg-white text-navy-700",
            className
          )}
        >
          <span className="block truncate">{current?.label}</span>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[60vh] overflow-y-auto rounded-xl border border-slate-100 bg-white/95 backdrop-blur-lg p-2 shadow-dropdown animate-slide-down"
        >
          {/* Crimson accent bar — matches the header nav dropdowns */}
          <div className="h-0.5 w-8 bg-crimson-600 rounded-full mx-3 mb-2" />
          <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {options.map((o) => (
              <DropdownMenu.RadioItem
                key={o.value}
                value={o.value}
                className={cn(
                  "block px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer select-none outline-none transition-colors duration-150",
                  "text-slate-700 hover:bg-[#e9edf3] hover:text-navy-700 data-[highlighted]:bg-[#e9edf3] data-[highlighted]:text-navy-700",
                  "data-[state=checked]:bg-navy-50 data-[state=checked]:text-navy-700"
                )}
              >
                {o.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
