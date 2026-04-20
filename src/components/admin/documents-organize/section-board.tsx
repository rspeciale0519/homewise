"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentSection,
} from "@/app/admin/documents/types";
import { CategoryColumn } from "./category-column";
import { categoryDragId } from "./category-header";

interface SectionBoardProps {
  section: DocumentSection;
  categories: AdminCategoryTree[];
  preview: boolean;
  search: string;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
  onEditCategory: (c: AdminCategoryTree) => void;
  onAddCategory: () => void;
  onAddDocumentToCategory: (c: AdminCategoryTree) => void;
  onCardClick: (doc: AdminDocumentInCategory) => void;
  onEditDoc: (doc: AdminDocumentInCategory) => void;
  onTogglePublish: (doc: AdminDocumentInCategory) => void;
  onToggleQuickAccess: (doc: AdminDocumentInCategory) => void;
  onMoveTo: (
    doc: AdminDocumentInCategory,
    fromCategoryId: string,
    toCategoryId: string,
  ) => void;
  onOpenInViewer: (doc: AdminDocumentInCategory) => void;
  onDeleteDoc: (doc: AdminDocumentInCategory) => void;
}

export function SectionBoard(props: SectionBoardProps) {
  const {
    categories,
    preview,
    search,
    targetCategories,
    onEditCategory,
    onAddCategory,
    onAddDocumentToCategory,
    onCardClick,
    onEditDoc,
    onTogglePublish,
    onToggleQuickAccess,
    onMoveTo,
    onOpenInViewer,
    onDeleteDoc,
  } = props;

  const visibleCategories = preview
    ? categories.filter((c) => c.documents.some((d) => d.published))
    : categories;

  const categoryIds = visibleCategories.map((c) => categoryDragId(c.id));

  if (preview && visibleCategories.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-slate-400">
        No documents yet.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SortableContext
        items={categoryIds}
        strategy={verticalListSortingStrategy}
      >
        {visibleCategories.map((category) => (
          <CategoryColumn
            key={category.id}
            category={category}
            preview={preview}
            search={search}
            targetCategories={targetCategories}
            onEditCategory={onEditCategory}
            onAddDocumentToCategory={onAddDocumentToCategory}
            onCardClick={onCardClick}
            onEditDoc={onEditDoc}
            onTogglePublish={onTogglePublish}
            onToggleQuickAccess={onToggleQuickAccess}
            onMoveTo={onMoveTo}
            onOpenInViewer={onOpenInViewer}
            onDeleteDoc={onDeleteDoc}
          />
        ))}
      </SortableContext>

      {!preview && (
        <button
          type="button"
          onClick={onAddCategory}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      )}
    </div>
  );
}
