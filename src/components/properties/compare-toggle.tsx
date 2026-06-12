"use client";

import { useEffect, useState } from "react";
import {
  COMPARE_CHANGED_EVENT,
  COMPARE_MAX,
  readCompareIds,
  toggleCompareId,
  writeCompareIds,
} from "@/lib/compare-store";

export function CompareToggle({ propertyId }: { propertyId: string }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readCompareIds());
    sync();
    window.addEventListener(COMPARE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COMPARE_CHANGED_EVENT, sync);
  }, []);

  const selected = ids.includes(propertyId);
  const full = !selected && ids.length >= COMPARE_MAX;

  return (
    <button
      type="button"
      disabled={full}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        writeCompareIds(toggleCompareId(readCompareIds(), propertyId));
      }}
      title={full ? `Compare is full (max ${COMPARE_MAX})` : selected ? "Remove from compare" : "Add to compare"}
      aria-pressed={selected}
      className={`absolute top-12 right-3 z-20 h-8 w-8 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm transition-colors ${
        selected
          ? "bg-navy-700 text-white"
          : "bg-white/90 text-slate-500 hover:text-navy-700 disabled:opacity-40"
      }`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10l-4-4m4 4l4-4m6-6v10m0-10l-4 4m4-4l4 4" />
      </svg>
    </button>
  );
}
