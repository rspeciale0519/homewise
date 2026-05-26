"use client";

import { DragPreviewCard } from "./drag-preview-card";
import { BulkDragPreview } from "./bulk-drag-preview";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
} from "@/app/admin/documents/types";

interface DragOverlayProps {
  activeDragDoc: AdminDocumentInCategory | null;
  activeDragCategory: AdminCategoryTree | null;
  activeDragBulkDocs: ReadonlyArray<{ name: string }>;
}

export function DragOverlay({
  activeDragDoc,
  activeDragCategory,
  activeDragBulkDocs,
}: DragOverlayProps) {
  if (activeDragBulkDocs.length > 0) {
    return <BulkDragPreview docs={activeDragBulkDocs} />;
  }
  if (activeDragDoc) {
    return <DragPreviewCard document={activeDragDoc} />;
  }
  if (activeDragCategory) {
    return (
      <div className="px-4 py-3 rounded-xl border border-crimson-200 bg-white shadow-2xl font-serif text-lg font-semibold text-navy-700 pointer-events-none">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-crimson-600 mr-2 align-middle" />
        {activeDragCategory.title}
      </div>
    );
  }
  return null;
}
