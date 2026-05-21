"use client";

import { FileText, FolderInput, Trash2 } from "lucide-react";
import type { AdminUncategorizedDoc } from "./types";

interface UncategorizedListProps {
  docs: AdminUncategorizedDoc[];
  onEdit: (doc: AdminUncategorizedDoc) => void;
  onDelete: (doc: AdminUncategorizedDoc) => void;
}

export function UncategorizedList({
  docs,
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
  return (
    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
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
            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-navy-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          >
            <FolderInput className="h-3.5 w-3.5" />
            Categorize
          </button>
          <button
            type="button"
            aria-label={`Delete ${doc.name}`}
            onClick={() => onDelete(doc)}
            className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 rounded-lg hover:bg-crimson-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
