"use client";

import { ArrowRightCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSwitchToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function AutoSwitchToggle({ value, onChange }: AutoSwitchToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={
        value
          ? "Auto-switch to destination tab after assign — on"
          : "Auto-switch to destination tab after assign — off"
      }
      onClick={() => onChange(!value)}
      title={
        value
          ? "On — after assign, switch to the destination tab"
          : "Off — stay on Uncategorized after assign"
      }
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1",
        value
          ? "bg-navy-600 text-white border-navy-600 hover:bg-navy-700"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
      )}
    >
      <ArrowRightCircle
        className={cn("h-4 w-4", value ? "" : "opacity-60")}
      />
      <span className="hidden sm:inline">
        {value ? "Auto-switch" : "Stay here"}
      </span>
    </button>
  );
}
