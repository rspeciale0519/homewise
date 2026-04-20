"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import type { AdminCategoryTree } from "@/app/admin/documents/types";

interface CategoryHeaderProps {
  category: AdminCategoryTree;
  preview: boolean;
  onEdit: (category: AdminCategoryTree) => void;
}

function categoryDragId(categoryId: string): string {
  return `cat::${categoryId}`;
}

export function CategoryHeader({
  category,
  preview,
  onEdit,
}: CategoryHeaderProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id: categoryDragId(category.id),
      disabled: preview,
      data: { type: "category", categoryId: category.id },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 mb-5 relative"
    >
      {!preview && (
        <button
          type="button"
          aria-label={`Drag to reorder ${category.title}`}
          className="h-6 w-5 inline-flex items-center justify-center rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-navy-500 cursor-grab active:cursor-grabbing focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="h-1.5 w-1.5 rounded-full bg-crimson-600" />

      <h2 className="font-serif text-xl font-semibold text-navy-700">
        {category.title}
      </h2>

      <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
        {category.documents.length}
      </span>

      {!preview && (
        <button
          type="button"
          aria-label={`Edit category ${category.title}`}
          onClick={() => onEdit(category)}
          className="ml-auto h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-300 opacity-0 group-hover:opacity-100 hover:text-navy-600 hover:bg-slate-100 transition-colors focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export { categoryDragId };
