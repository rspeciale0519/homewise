"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ViewerToolbarProps {
  documentName: string;
  currentPage: number;
  numPages: number | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
}

export function ViewerToolbar({
  documentName,
  currentPage,
  numPages,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}: ViewerToolbarProps) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Back + Document Name */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/agent-hub/documents"
            className="shrink-0 flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <span className="hidden sm:inline">Documents</span>
          </Link>
          <div className="h-5 w-px bg-slate-200 shrink-0" />
          <h1 className="text-sm font-semibold text-navy-700 truncate">
            {documentName}
          </h1>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            disabled={zoom <= 0.5}
            title="Zoom out"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 12h-15"
              />
            </svg>
          </Button>

          <button
            onClick={onZoomFit}
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-navy-700 hover:bg-slate-50 rounded transition-colors min-w-[3.5rem] text-center"
            title="Fit to width"
          >
            {zoomPercent}%
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            disabled={zoom >= 3}
            title="Zoom in"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </Button>
        </div>

        {/* Right: Page Indicator */}
        <div className="flex items-center gap-3">
          {numPages !== null && (
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Page {currentPage} of {numPages}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
