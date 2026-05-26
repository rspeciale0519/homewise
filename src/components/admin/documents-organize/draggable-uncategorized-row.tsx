"use client";

import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { FileText, FolderInput, GripVertical, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AdminUncategorizedDoc } from "@/app/admin/documents/types";
import type { UseUncategorizedSelectionResult } from "@/app/admin/documents/use-uncategorized-selection";

export const UNCAT_DRAG_PREFIX = "uncat::";

export function uncatDragId(documentId: string): string {
  return `${UNCAT_DRAG_PREFIX}${documentId}`;
}

interface DraggableUncategorizedRowProps {
  doc: AdminUncategorizedDoc;
  orderedDocIds: readonly string[];
  selection: UseUncategorizedSelectionResult;
  onEdit: (doc: AdminUncategorizedDoc) => void;
  onDelete: (doc: AdminUncategorizedDoc) => void;
}

export function DraggableUncategorizedRow({
  doc,
  orderedDocIds,
  selection,
  onEdit,
  onDelete,
}: DraggableUncategorizedRowProps) {
  const checked = selection.isSelected(doc.id);

  const documentIds = useMemo(() => {
    if (selection.selectedIds.has(doc.id)) {
      return orderedDocIds.filter((id) => selection.selectedIds.has(id));
    }
    return [doc.id];
  }, [doc.id, selection.selectedIds, orderedDocIds]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: uncatDragId(doc.id),
    data: {
      type: "uncategorized-bulk",
      documentIds,
      primaryDocId: doc.id,
    },
  });

  return (
    <div
      role="option"
      aria-selected={checked}
      className={cn(
        "flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors",
        checked ? "bg-crimson-50/60" : "hover:bg-slate-50/40",
        isDragging && "opacity-30",
      )}
    >
      <Checkbox
        checked={checked}
        aria-label={checked ? `Deselect ${doc.name}` : `Select ${doc.name}`}
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
        <p className="text-sm font-medium text-navy-700 truncate">{doc.name}</p>
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
      <button
        ref={setNodeRef}
        type="button"
        aria-label={`Drag ${doc.name}`}
        {...attributes}
        {...listeners}
        className="hidden sm:inline-flex h-9 w-9 items-center justify-center text-slate-400 hover:text-navy-700 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
