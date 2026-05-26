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
import type { UseDocumentSelectionResult } from "@/app/admin/documents/use-document-selection";
import { CategoryColumn } from "./category-column";
import { categoryDragId } from "./category-header";
import { SectionSelectAllStrip } from "./section-select-all-strip";

interface SectionBoardProps {
  section: DocumentSection;
  categories: AdminCategoryTree[];
  preview: boolean;
  search: string;
  selection: UseDocumentSelectionResult;
  selectionActive: boolean;
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

function matchesSearch(name: string, slug: string, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  return name.toLowerCase().includes(q) || slug.toLowerCase().includes(q);
}

export function SectionBoard(props: SectionBoardProps) {
  const {
    section,
    categories,
    preview,
    search,
    selection,
    selectionActive,
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

  // Docs eligible for "select all in section": all docs across every
  // category on this tab that pass the current search filter. In preview
  // mode the strip is hidden.
  const selectableDocIds = visibleCategories.flatMap((c) =>
    c.documents
      .filter((d) => matchesSearch(d.name, d.slug, search))
      .map((d) => d.id),
  );
  const selectedInSection = selectableDocIds.filter((id) =>
    selection.isSelected(id),
  ).length;

  if (preview && visibleCategories.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-slate-400">
        No documents yet.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {!preview && (
        <SectionSelectAllStrip
          section={section}
          totalVisible={selectableDocIds.length}
          selectedInSection={selectedInSection}
          onToggleAll={() => selection.toggleSubset(selectableDocIds)}
          onClear={selection.clear}
        />
      )}
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
            selection={selection}
            selectionActive={selectionActive}
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
