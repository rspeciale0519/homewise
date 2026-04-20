"use client";

import { Eye, EyeOff } from "lucide-react";

interface PreviewToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function PreviewToggle({ value, onChange }: PreviewToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1 ${
        value
          ? "bg-navy-600 text-white border-navy-600 hover:bg-navy-700"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {value ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {value ? "Exit preview" : "Preview as agent"}
    </button>
  );
}
