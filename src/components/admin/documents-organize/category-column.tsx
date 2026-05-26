"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
} from "@/app/admin/documents/types";
import type { UseDocumentSelectionResult } from "@/app/admin/documents/use-document-selection";
import { CategoryHeader } from "./category-header";
import { DocumentCard, documentDragId } from "./document-card";
import { EmptyCategoryPlaceholder } from "./empty-category-placeholder";

interface CategoryColumnProps {
  category: AdminCategoryTree;
  preview: boolean;
  search: string;
  selection: UseDocumentSelectionResult;
  selectionActive: boolean;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
  onEditCategory: (category: AdminCategoryTree) => void;
  onAddDocumentToCategory: (category: AdminCategoryTree) => void;
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

function matchesSearch(
  doc: AdminDocumentInCategory,
  search: string,
): boolean {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  return (
    doc.name.toLowerCase().includes(q) ||
    doc.slug.toLowerCase().includes(q)
  );
}

function categoryDroppableId(categoryId: string): string {
  return `catdrop::${categoryId}`;
}

export function CategoryColumn(props: CategoryColumnProps) {
  const {
    category,
    preview,
    search,
    selection,
    selectionActive,
    targetCategories,
    onEditCategory,
    onAddDocumentToCategory,
    onCardClick,
    onEditDoc,
    onTogglePublish,
    onToggleQuickAccess,
    onMoveTo,
    onOpenInViewer,
    onDeleteDoc,
  } = props;

  const visibleDocs = preview
    ? category.documents.filter((d) => d.published)
    : category.documents;

  const sortableIds = visibleDocs.map((d) =>
    documentDragId(d.id, category.id),
  );

  // selectable docs = those currently matching the search (non-matches are
  // rendered dimmed and excluded from "select all in category" semantics).
  const selectableDocIds = visibleDocs
    .filter((d) => matchesSearch(d, search))
    .map((d) => d.id);
  const selectedCountInCategory = selectableDocIds.filter((id) =>
    selection.isSelected(id),
  ).length;

  const { setNodeRef, isOver } = useDroppable({
    id: categoryDroppableId(category.id),
    data: { type: "category-drop", categoryId: category.id },
    disabled: preview,
  });

  if (preview && visibleDocs.length === 0) {
    return null;
  }

  return (
    <section>
      <CategoryHeader
        category={category}
        preview={preview}
        onEdit={onEditCategory}
        visibleDocIds={selectableDocIds}
        selectedCountInCategory={selectedCountInCategory}
        onToggleCategory={selection.toggleSubset}
      />

      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`rounded-xl transition-colors ${
            isOver && !preview
              ? "bg-crimson-50/40 ring-2 ring-crimson-300/60 ring-offset-2 ring-offset-slate-50"
              : ""
          }`}
        >
          {visibleDocs.length === 0 && !preview ? (
            <EmptyCategoryPlaceholder
              categoryId={category.id}
              onAddDocument={() => onAddDocumentToCategory(category)}
            />
          ) : (
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
              {visibleDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  currentCategoryId={category.id}
                  currentSection={category.section}
                  preview={preview}
                  searchMatches={matchesSearch(doc, search)}
                  selection={selection}
                  selectionActive={selectionActive}
                  targetCategories={targetCategories}
                  onCardClick={onCardClick}
                  onEdit={onEditDoc}
                  onTogglePublish={onTogglePublish}
                  onToggleQuickAccess={onToggleQuickAccess}
                  onMoveTo={onMoveTo}
                  onOpenInViewer={onOpenInViewer}
                  onDelete={onDeleteDoc}
                />
              ))}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
