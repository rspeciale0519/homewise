import { cn } from "@/lib/utils";

interface MlsGridSourceLineProps {
  className?: string;
  showSoldDisclaimer?: boolean;
}

export function MlsGridSourceLine({
  className,
  showSoldDisclaimer = false,
}: MlsGridSourceLineProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs leading-relaxed text-slate-500",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span
          className="inline-flex w-fit items-center rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-bold tracking-[0.18em] text-slate-700"
          aria-label="MLS GRID"
        >
          MLS GRID
        </span>
        <p>
          Listing data is displayed as distributed by MLS GRID. Some IDX
          listings have been excluded from this website.
        </p>
      </div>
      {showSoldDisclaimer && (
        <p className="mt-2">
          Sold listing information, when shown, is provided for informational
          use only and may not reflect all market activity.
        </p>
      )}
    </div>
  );
}
