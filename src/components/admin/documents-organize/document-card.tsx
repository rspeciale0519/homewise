"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
} from "@/app/admin/documents/types";
import { DocumentCardMenu } from "./document-card-menu";

interface DocumentCardProps {
  document: AdminDocumentInCategory;
  currentCategoryId: string;
  preview: boolean;
  searchMatches: boolean;
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
    preview,
    searchMatches,
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
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id,
      disabled: preview || !searchMatches,
      data: {
        type: "document",
        documentId: document.id,
        fromCategoryId: currentCategoryId,
      },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : searchMatches ? 1 : 0.3,
    zIndex: isDragging ? 10 : "auto",
  };

  const isMuted = !document.published && !preview;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role={preview ? "link" : "button"}
      tabIndex={0}
      onClick={() => onCardClick(document)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCardClick(document);
      }}
      className={`group relative flex items-start gap-4 p-4 pl-5 rounded-xl border bg-white transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 ${
        isMuted
          ? "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
          : "border-slate-100 hover:border-crimson-200 hover:bg-crimson-50/30"
      } ${isDragging ? "shadow-lg ring-2 ring-navy-400/20" : ""}`}
    >
      {isMuted && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r bg-slate-200"
        />
      )}

      {!preview && (
        <button
          type="button"
          aria-label={`Drag to reorder ${document.name}`}
          className="absolute left-1 top-1 h-6 w-5 inline-flex items-center justify-center rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-navy-500 cursor-grab active:cursor-grabbing focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 transition-opacity"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="shrink-0 mt-0.5">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
            isMuted
              ? "bg-slate-50 group-hover:bg-slate-100"
              : "bg-navy-50 group-hover:bg-crimson-100"
          }`}
        >
          <svg
            className={`h-4 w-4 transition-colors ${
              isMuted
                ? "text-slate-300"
                : "text-navy-400 group-hover:text-crimson-600"
            }`}
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
          className={`text-sm font-semibold transition-colors ${
            isMuted
              ? "text-slate-500 group-hover:text-slate-600"
              : "text-navy-700 group-hover:text-crimson-700"
          }`}
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
