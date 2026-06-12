"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  COMPARE_CHANGED_EVENT,
  readCompareIds,
  writeCompareIds,
} from "@/lib/compare-store";

export function CompareBar() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readCompareIds());
    sync();
    window.addEventListener(COMPARE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COMPARE_CHANGED_EVENT, sync);
  }, []);

  if (ids.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-navy-800 text-white rounded-2xl shadow-elevated px-5 py-3">
      <span className="text-sm font-medium">
        {ids.length} {ids.length === 1 ? "property" : "properties"} selected
      </span>
      {ids.length >= 2 ? (
        <Link
          href={`/properties/compare?ids=${ids.join(",")}`}
          className="px-4 py-1.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-sm font-semibold transition-colors"
        >
          Compare
        </Link>
      ) : (
        <span className="text-xs text-slate-300">Select at least 2 to compare</span>
      )}
      <button
        type="button"
        onClick={() => writeCompareIds([])}
        className="text-xs text-slate-300 hover:text-white transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
