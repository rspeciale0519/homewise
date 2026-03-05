"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { Property } from "@/providers/property-provider";

const ListingMapPanel = dynamic(
  () => import("./listing-map-panel").then((m) => ({ default: m.ListingMapPanel })),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse" /> }
);

interface PropertySearchShellProps {
  properties: Property[];
  children: React.ReactNode;
}

type ViewMode = "split" | "list" | "map";

export function PropertySearchShell({ properties, children }: PropertySearchShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const handleBoundsChange = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("north", bounds.north.toFixed(6));
      params.set("south", bounds.south.toFixed(6));
      params.set("east", bounds.east.toFixed(6));
      params.set("west", bounds.west.toFixed(6));
      params.delete("polygon");
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const handlePolygonDraw = useCallback(
    (polygon: [number, number][] | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (polygon) {
        params.set("polygon", JSON.stringify(polygon));
        params.delete("north");
        params.delete("south");
        params.delete("east");
        params.delete("west");
      } else {
        params.delete("polygon");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center justify-end gap-1 mb-4 sm:hidden">
        <ViewToggle mode="list" current={viewMode} onClick={setViewMode} label="List" />
        <ViewToggle mode="map" current={viewMode} onClick={setViewMode} label="Map" />
      </div>
      <div className="hidden sm:flex items-center justify-end gap-1 mb-4">
        <ViewToggle mode="split" current={viewMode} onClick={setViewMode} label="Split" />
        <ViewToggle mode="list" current={viewMode} onClick={setViewMode} label="List" />
        <ViewToggle mode="map" current={viewMode} onClick={setViewMode} label="Map" />
      </div>

      <div className={cn(
        "gap-6",
        viewMode === "split" && "grid grid-cols-1 lg:grid-cols-[1fr_1fr]",
      )}>
        {viewMode !== "map" && (
          <div className={cn(
            viewMode === "split" && "max-h-[80vh] overflow-y-auto pr-2",
          )}>
            {children}
          </div>
        )}
        {viewMode !== "list" && (
          <div className={cn(
            "rounded-2xl overflow-hidden border border-slate-200 shadow-card",
            viewMode === "split" ? "hidden lg:block h-[80vh] sticky top-24" : "h-[80vh]",
          )}>
            <ListingMapPanel
              properties={properties}
              onBoundsChange={handleBoundsChange}
              onPolygonDraw={handlePolygonDraw}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ViewToggle({
  mode,
  current,
  onClick,
  label,
}: {
  mode: ViewMode;
  current: ViewMode;
  onClick: (m: ViewMode) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onClick(mode)}
      className={cn(
        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
        current === mode
          ? "bg-navy-600 text-white"
          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}
