"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "draft" | "scheduled" | "published" | "archived";

interface StatusDropdownProps {
  current: Status;
  onChange: (next: Status) => void | Promise<void>;
  /** Stops row click from triggering when clicking inside. */
  stopPropagation?: boolean;
}

const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const STATUS_BADGE: Record<Status, string> = {
  draft: "bg-slate-100 text-slate-500 hover:bg-slate-200",
  scheduled: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  published: "bg-green-100 text-green-700 hover:bg-green-200",
  archived: "bg-amber-100 text-amber-700 hover:bg-amber-200",
};

/**
 * Small inline dropdown for changing a single Content row's status
 * without opening the drawer. Used on the admin Content table.
 */
export function StatusDropdown({
  current,
  onChange,
  stopPropagation,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative inline-block"
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors",
          STATUS_BADGE[current],
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {STATUS_LABELS[current]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-20 left-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <button
              key={s}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                void onChange(s);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-navy-700 hover:bg-slate-50"
            >
              {STATUS_LABELS[s]}
              {s === current && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
