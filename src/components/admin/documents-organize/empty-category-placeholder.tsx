"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

interface EmptyCategoryPlaceholderProps {
  categoryId: string;
  onAddDocument: () => void;
}

export function EmptyCategoryPlaceholder({
  categoryId,
  onAddDocument,
}: EmptyCategoryPlaceholderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty::${categoryId}`,
    data: { type: "empty-category", categoryId },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onAddDocument}
      className={`w-full flex items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 ${
        isOver
          ? "border-crimson-400 bg-crimson-50/60 text-crimson-700 scale-[1.01]"
          : "border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-500"
      }`}
    >
      <Plus className="h-4 w-4" />
      {isOver ? "Drop here" : "Drop documents here or click to add"}
    </button>
  );
}
