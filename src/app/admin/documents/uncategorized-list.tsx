"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DraggableUncategorizedRow } from "@/components/admin/documents-organize/draggable-uncategorized-row";
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
  const orderedDocIds = useMemo(() => docs.map((d) => d.id), [docs]);

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
        />
        <p className="text-xs font-semibold text-slate-600 flex-1 min-w-0 truncate">
          {selection.selectedCount > 0
            ? `${selection.selectedCount} selected`
            : `Select all (${docs.length})`}
        </p>
      </div>
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-label="Loose documents pending triage"
        className="divide-y divide-slate-100"
      >
        {docs.map((doc) => (
          <DraggableUncategorizedRow
            key={doc.id}
            doc={doc}
            orderedDocIds={orderedDocIds}
            selection={selection}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
