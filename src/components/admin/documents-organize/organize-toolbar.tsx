"use client";

import { Plus, Search } from "lucide-react";
import { PreviewToggle } from "./preview-toggle";

interface OrganizeToolbarProps {
  preview: boolean;
  onPreviewChange: (next: boolean) => void;
  search: string;
  onSearchChange: (next: string) => void;
  onAddDocument: () => void;
}

export function OrganizeToolbar({
  preview,
  onPreviewChange,
  search,
  onSearchChange,
  onAddDocument,
}: OrganizeToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={preview}
          className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <PreviewToggle value={preview} onChange={onPreviewChange} />
        {!preview && (
          <button
            type="button"
            onClick={onAddDocument}
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 focus-visible:ring-offset-1"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        )}
      </div>
    </div>
  );
}
