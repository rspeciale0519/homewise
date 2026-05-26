"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentSection,
} from "@/app/admin/documents/types";
import type { UseDocumentSelectionResult } from "@/app/admin/documents/use-document-selection";
import { DocumentCardMenu } from "./document-card-menu";

interface DocumentCardProps {
  document: AdminDocumentInCategory;
  currentCategoryId: string;
  currentSection: DocumentSection;
  preview: boolean;
  searchMatches: boolean;
  selection: UseDocumentSelectionResult;
  selectionActive: boolean;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
  onCardClick: (doc: AdminDocumentInCategory) => void;
  onEdit: (doc: AdminDocumentInCategory) => void;
  onTogglePublish: (doc: AdminDocumentInCategory) => void;
  onToggleQuickAccess: (doc: AdminDocumentInCategory) => void;
  onMoveTo: (
    doc: AdminDocumentInCategory,
    fromCategoryId: string,
    toCategoryId: string,
  ) => void;
  onOpenInViewer: (doc: AdminDocumentInCategory) => void;
  onDelete: (doc: AdminDocumentInCategory) => void;
}

function dragId(documentId: string, categoryId: string): string {
  return `doc::${categoryId}::${documentId}`;
}

export function DocumentCard(props: DocumentCardProps) {
  const {
    document,
    currentCategoryId,
    currentSection,
    preview,
    searchMatches,
    selection,
    selectionActive,
    targetCategories,
    onCardClick,
    onEdit,
    onTogglePublish,
    onToggleQuickAccess,
    onMoveTo,
    onOpenInViewer,
    onDelete,
  } = props;

  const id = dragId(document.id, currentCategoryId);
  const isChecked = selection.isSelected(document.id);
  // When this card is part of a multi-select (size >= 2), broadcast a
  // "section-bulk" payload so the drag-end dispatcher routes the entire
  // selection rather than a single document. Otherwise fall back to the
  // single-doc reorder/cross-category data.
  const isBulkDrag = !preview && isChecked && selection.selectedCount >= 2;
  const sortableData = isBulkDrag
    ? {
        type: "section-bulk" as const,
        documentIds: Array.from(selection.selectedIds),
        primaryDocId: document.id,
        fromSection: currentSection,
      }
    : {
        type: "document" as const,
        documentId: document.id,
        fromCategoryId: currentCategoryId,
      };
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id,
      disabled: preview || !searchMatches,
      data: sortableData,
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : searchMatches ? 1 : 0.3,
    visibility: isDragging ? "hidden" : "visible",
    zIndex: isDragging ? 10 : "auto",
  };

  const isMuted = !document.published && !preview;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onCardClick(document)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCardClick(document);
      }}
      {...(preview ? {} : attributes)}
      {...(preview ? {} : listeners)}
      role={preview ? "link" : "button"}
      tabIndex={0}
      className={cn(
        "group relative flex items-start gap-4 p-4 pl-5 rounded-xl border bg-white transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600",
        isChecked
          ? "border-crimson-300 bg-crimson-50/60 ring-2 ring-crimson-400/60 ring-offset-1"
          : isMuted
            ? "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
            : "border-slate-100 hover:border-crimson-200 hover:bg-crimson-50/30",
        isDragging && "shadow-lg ring-2 ring-navy-400/20",
        "touch-none select-none",
      )}
    >
      {isMuted && !isChecked && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r bg-slate-200"
        />
      )}

      {!preview && (
        <span
          className={cn(
            "absolute left-1.5 top-1.5 z-10 transition-opacity",
            selectionActive || isChecked
              ? "opacity-100"
              : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <Checkbox
            checked={isChecked}
            aria-label={
              isChecked ? `Deselect ${document.name}` : `Select ${document.name}`
            }
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              selection.toggleOne(document.id, {
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
              });
            }}
            className="h-5 w-5"
          />
        </span>
      )}

      <div className="shrink-0 mt-0.5">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
            isChecked
              ? "bg-crimson-100"
              : isMuted
                ? "bg-slate-50 group-hover:bg-slate-100"
                : "bg-navy-50 group-hover:bg-crimson-100",
          )}
        >
          <svg
            className={cn(
              "h-4 w-4 transition-colors",
              isChecked
                ? "text-crimson-600"
                : isMuted
                  ? "text-slate-300"
                  : "text-navy-400 group-hover:text-crimson-600",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold transition-colors",
            isChecked
              ? "text-crimson-700"
              : isMuted
                ? "text-slate-500 group-hover:text-slate-600"
                : "text-navy-700 group-hover:text-crimson-700",
          )}
        >
          <span className="align-middle">{document.name}</span>
          {!document.published && !preview && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100 align-middle">
              Draft
            </span>
          )}
          {document.quickAccess && !preview && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 align-middle">
              Quick
            </span>
          )}
        </p>
        {document.description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
            {document.description}
          </p>
        )}
      </div>

      {!preview && (
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DocumentCardMenu
            document={document}
            currentCategoryId={currentCategoryId}
            targetCategories={targetCategories}
            onEdit={onEdit}
            onTogglePublish={onTogglePublish}
            onToggleQuickAccess={onToggleQuickAccess}
            onMoveTo={onMoveTo}
            onOpenInViewer={onOpenInViewer}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}

export { dragId as documentDragId };
