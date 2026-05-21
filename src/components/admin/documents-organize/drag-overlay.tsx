"use client";

import { DragPreviewCard } from "./drag-preview-card";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
} from "@/app/admin/documents/types";

interface DragOverlayProps {
  activeDragDoc: AdminDocumentInCategory | null;
  activeDragCategory: AdminCategoryTree | null;
}

export function DragOverlay({
  activeDragDoc,
  activeDragCategory,
}: DragOverlayProps) {
  return activeDragDoc ? (
    <DragPreviewCard document={activeDragDoc} />
  ) : activeDragCategory ? (
    <div className="px-4 py-3 rounded-xl border border-crimson-200 bg-white shadow-2xl font-serif text-lg font-semibold text-navy-700 pointer-events-none">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-crimson-600 mr-2 align-middle" />
      {activeDragCategory.title}
    </div>
  ) : null;
}
