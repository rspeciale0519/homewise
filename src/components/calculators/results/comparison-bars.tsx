"use client";

import { CHART_COLORS } from "@/lib/calculators/constants";

interface ComparisonBarsProps {
  originalMonths: number;
  newMonths: number;
  originalLabel?: string;
  newLabel?: string;
  originalCost: string;
  newCost: string;
  newBarColor?: string;
}

export function ComparisonBars({
  originalMonths,
  newMonths,
  originalLabel = "Original",
  newLabel = "New",
  originalCost,
  newCost,
  newBarColor,
}: ComparisonBarsProps) {
  const maxMonths = Math.max(originalMonths, newMonths, 1);

  const formatDuration = (months: number): string => {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years === 0) return `${rem} month${rem !== 1 ? "s" : ""}`;
    if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
    return `${years} year${years !== 1 ? "s" : ""}, ${rem} month${rem !== 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs text-navy-200 mb-1.5">
          <span>{originalLabel}</span>
          <span className="tabular-nums">{formatDuration(originalMonths)}</span>
        </div>
        <div className="h-10 bg-navy-800 rounded-lg overflow-hidden">
          <div
            className="h-full rounded-lg transition-all duration-700 ease-out"
            style={{
              width: `${(originalMonths / maxMonths) * 100}%`,
              backgroundColor: CHART_COLORS.originalTimeline,
            }}
          />
        </div>
        <p className="text-xs text-navy-300 mt-1 tabular-nums">{originalCost}</p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-navy-200 mb-1.5">
          <span>{newLabel}</span>
          <span className="tabular-nums">{formatDuration(newMonths)}</span>
        </div>
        <div className="h-10 bg-navy-800 rounded-lg overflow-hidden">
          <div
            className="h-full rounded-lg transition-all duration-700 ease-out"
            style={{
              width: `${(newMonths / maxMonths) * 100}%`,
              backgroundColor: newBarColor ?? CHART_COLORS.newTimeline,
            }}
          />
        </div>
        <p className="text-xs text-navy-300 mt-1 tabular-nums">{newCost}</p>
      </div>
    </div>
  );
}
