"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Eye,
  MoreVertical,
  Pencil,
  Star,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
  ChevronRight,
} from "lucide-react";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentSection,
} from "@/app/admin/documents/types";

interface DocumentCardMenuProps {
  document: AdminDocumentInCategory;
  currentCategoryId: string;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
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

const neutralItem =
  "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700";
const destructiveItem =
  "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-crimson-50 hover:text-crimson-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-crimson-50 data-[highlighted]:text-crimson-700";
const subTriggerItem =
  "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700 data-[state=open]:bg-slate-50 data-[state=open]:text-navy-700";

const SECTION_LABELS: Record<DocumentSection, string> = {
  office: "Office",
  listing: "Listing",
  sales: "Sales",
};

const contentClass =
  "bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 min-w-[220px] z-50 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 duration-200";

export function DocumentCardMenu({
  document,
  currentCategoryId,
  targetCategories,
  onEdit,
  onTogglePublish,
  onToggleQuickAccess,
  onMoveTo,
  onOpenInViewer,
  onDelete,
}: DocumentCardMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${document.name}`}
          onClick={(e) => e.stopPropagation()}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-navy-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className={contentClass}
        >
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onEdit(document);
            }}
            className={neutralItem}
          >
            <Pencil className="h-4 w-4" />
            Edit…
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onTogglePublish(document);
            }}
            className={neutralItem}
          >
            {document.published ? (
              <>
                <XCircle className="h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Publish
              </>
            )}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onToggleQuickAccess(document);
            }}
            className={neutralItem}
          >
            <Star
              className={`h-4 w-4 ${
                document.quickAccess ? "fill-amber-500 text-amber-500" : ""
              }`}
            />
            {document.quickAccess
              ? "Remove from Quick Access"
              : "Add to Quick Access"}
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={subTriggerItem}>
              <ArrowRight className="h-4 w-4" />
              <span className="flex-1">Move to…</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={6}
                className={contentClass}
              >
                {(["office", "listing", "sales"] as DocumentSection[]).map(
                  (section) => (
                    <DropdownMenu.Sub key={section}>
                      <DropdownMenu.SubTrigger className={subTriggerItem}>
                        <span className="flex-1">{SECTION_LABELS[section]}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.SubContent
                          sideOffset={6}
                          className={contentClass}
                        >
                          {targetCategories[section].length === 0 ? (
                            <div className="px-4 py-2.5 text-xs text-slate-400 italic">
                              No categories — add one first.
                            </div>
                          ) : (
                            targetCategories[section].map((cat) => {
                              const disabled = cat.id === currentCategoryId;
                              return (
                                <DropdownMenu.Item
                                  key={cat.id}
                                  disabled={disabled}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    if (disabled) return;
                                    onMoveTo(
                                      document,
                                      currentCategoryId,
                                      cat.id,
                                    );
                                  }}
                                  className={`${neutralItem} ${
                                    disabled ? "opacity-40 cursor-default" : ""
                                  }`}
                                >
                                  <span className="h-1 w-1 rounded-full bg-crimson-600" />
                                  {cat.title}
                                </DropdownMenu.Item>
                              );
                            })
                          )}
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Sub>
                  ),
                )}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onOpenInViewer(document);
            }}
            className={neutralItem}
          >
            <Eye className="h-4 w-4" />
            View in viewer
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onDelete(document);
            }}
            className={destructiveItem}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
