"use client";

import { FolderInput, Plus, Search, Trash2, UploadCloud } from "lucide-react";
import { PreviewToggle } from "./preview-toggle";
import { AutoSwitchToggle } from "./auto-switch-toggle";

interface OrganizeToolbarProps {
  preview: boolean;
  onPreviewChange: (next: boolean) => void;
  search: string;
  onSearchChange: (next: string) => void;
  onAddDocument: () => void;
  onBulkDelete: () => void;
  onBulkUpload: () => void;
  autoSwitch: boolean;
  onAutoSwitchChange: (next: boolean) => void;
  selectionCount: number;
  onMoveSelection: () => void;
  onClearSelection: () => void;
}

export function OrganizeToolbar({
  preview,
  onPreviewChange,
  search,
  onSearchChange,
  onAddDocument,
  onBulkDelete,
  onBulkUpload,
  autoSwitch,
  onAutoSwitchChange,
  selectionCount,
  onMoveSelection,
  onClearSelection,
}: OrganizeToolbarProps) {
  const hasSelection = selectionCount > 0 && !preview;
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

      <div className="flex items-center gap-2 flex-wrap">
        {hasSelection && (
          <>
            <button
              type="button"
              onClick={onMoveSelection}
              className="inline-flex items-center gap-1.5 h-11 sm:h-9 px-3 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 focus-visible:ring-offset-1"
            >
              <FolderInput className="h-4 w-4" />
              Move {selectionCount}…
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex items-center h-11 sm:h-9 px-2 text-xs font-semibold text-slate-500 hover:text-navy-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 rounded"
            >
              Clear
            </button>
          </>
        )}
        <PreviewToggle value={preview} onChange={onPreviewChange} />
        {!preview && (
          <AutoSwitchToggle
            value={autoSwitch}
            onChange={onAutoSwitchChange}
          />
        )}
        {!preview && (
          <>
            <button
              type="button"
              onClick={onBulkUpload}
              className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1"
            >
              <UploadCloud className="h-4 w-4" />
              Bulk upload
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              className="inline-flex items-center gap-1.5 h-9 px-3 border border-crimson-200 text-crimson-700 rounded-lg text-sm font-semibold hover:bg-crimson-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 focus-visible:ring-offset-1"
            >
              <Trash2 className="h-4 w-4" />
              Bulk delete
            </button>
            <button
              type="button"
              onClick={onAddDocument}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 focus-visible:ring-offset-1"
            >
              <Plus className="h-4 w-4" />
              Add Document
            </button>
          </>
        )}
      </div>
    </div>
  );
}
