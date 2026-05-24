"use client";

import { FileText, FolderInput, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AdminUncategorizedDoc } from "./types";
import type { UseUncategorizedSelectionResult } from "./use-uncategorized-selection";

interface UncategorizedListProps {
  docs: AdminUncategorizedDoc[];
  selection: UseUncategorizedSelectionResult;
  onEdit: (doc: AdminUncategorizedDoc) => void;
  onDelete: (doc: AdminUncategorizedDoc) => void;
}

export function UncategorizedList({
  docs,
  selection,
  onEdit,
  onDelete,
}: UncategorizedListProps) {
  if (docs.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-slate-400">
        Nothing uncategorized. Bulk-uploaded documents land here for sorting.
      </div>
    );
  }
  const headerChecked: boolean | "indeterminate" = selection.isAllSelected
    ? true
    : selection.isIndeterminate
      ? "indeterminate"
      : false;
  const headerLabel = selection.isAllSelected
    ? "Clear selection"
    : "Select all";
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-slate-100 bg-slate-50/60"
        role="toolbar"
        aria-label="Uncategorized selection toolbar"
      >
        <Checkbox
          checked={headerChecked}
          aria-label={headerLabel}
          onClick={selection.toggleAll}
          className="h-5 w-5"
        />
        <p className="text-xs font-semibold text-slate-600">
          {selection.selectedCount > 0
            ? `${selection.selectedCount} selected`
            : `Select all (${docs.length})`}
        </p>
        {selection.selectedCount > 0 && (
          <button
            type="button"
            onClick={selection.clear}
            className="ml-auto text-xs font-semibold text-slate-500 hover:text-navy-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 rounded"
          >
            Clear
          </button>
        )}
      </div>
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-label="Loose documents pending triage"
        className="divide-y divide-slate-100"
      >
        {docs.map((doc) => {
          const checked = selection.isSelected(doc.id);
          return (
            <div
              key={doc.id}
              role="option"
              aria-selected={checked}
              className={cn(
                "flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors",
                checked ? "bg-crimson-50/60" : "hover:bg-slate-50/40",
              )}
            >
              <Checkbox
                checked={checked}
                aria-label={
                  checked ? `Deselect ${doc.name}` : `Select ${doc.name}`
                }
                onClick={(e: React.MouseEvent) => {
                  selection.toggleOne(doc.id, {
                    shiftKey: e.shiftKey,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                  });
                }}
                className="h-5 w-5"
              />
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-700 truncate">
                  {doc.name}
                </p>
                <p className="text-xs text-slate-400 truncate">{doc.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(doc)}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-semibold text-navy-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
              >
                <FolderInput className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Categorize</span>
              </button>
              <button
                type="button"
                aria-label={`Delete ${doc.name}`}
                onClick={() => onDelete(doc)}
                className="h-9 w-9 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 rounded-lg hover:bg-crimson-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
