"use client";

import { useState } from "react";
import { FolderInput, Trash2, Eye, EyeOff, Archive } from "lucide-react";

type BulkStatus = "draft" | "published" | "archived";

interface CategoryOption {
  id: string;
  name: string;
}

interface TrainingBulkBarProps {
  selectedCount: number;
  categories: CategoryOption[];
  onClear: () => void;
  onChangeStatus: (status: BulkStatus) => void | Promise<void>;
  onChangeCategory: (categoryId: string | null) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  busy?: boolean;
}

/**
 * Action strip rendered between the Content/Courses/Progress tabs and the
 * Content table when one or more rows are selected. Mirrors the
 * Document Library's OrganizeToolbar pattern: h-10 height pinned in both
 * states, h-11 sm:h-9 tap targets on primary actions, secondary
 * actions live in a category dropdown.
 */
export function TrainingBulkBar({
  selectedCount,
  categories,
  onClear,
  onChangeStatus,
  onChangeCategory,
  onDelete,
  busy,
}: TrainingBulkBarProps) {
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleCategoryPick = (id: string | null) => {
    setCategoryMenuOpen(false);
    void onChangeCategory(id);
  };

  return (
    <div
      role="toolbar"
      aria-label="Bulk training content actions"
      className="flex items-center gap-2 px-3 sm:px-4 h-10 rounded-xl border border-slate-100 bg-slate-50/60"
    >
      <p className="text-xs font-semibold text-slate-600 truncate">
        {selectedCount} selected
      </p>

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          disabled={busy}
          onClick={() => onChangeStatus("published")}
          className="inline-flex items-center gap-1.5 h-11 sm:h-9 px-3 text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Publish
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onChangeStatus("draft")}
          className="inline-flex items-center gap-1.5 h-11 sm:h-9 px-3 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 disabled:opacity-50"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Unpublish
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onChangeStatus("archived")}
          className="inline-flex items-center gap-1.5 h-11 sm:h-9 px-3 text-xs font-semibold text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-50"
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </button>

        <div className="relative">
          <button
            type="button"
            disabled={busy}
            onClick={() => setCategoryMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 h-11 sm:h-9 px-3 text-xs font-semibold text-navy-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 disabled:opacity-50"
          >
            <FolderInput className="h-3.5 w-3.5" />
            Category…
          </button>
          {categoryMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1 w-56 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1"
            >
              <button
                role="menuitem"
                type="button"
                onClick={() => handleCategoryPick(null)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                (No category)
              </button>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-400 px-3 py-2">
                  No categories yet
                </p>
              ) : (
                categories.map((c) => (
                  <button
                    key={c.id}
                    role="menuitem"
                    type="button"
                    onClick={() => handleCategoryPick(c.id)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-navy-700 hover:bg-slate-50"
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete()}
          className="inline-flex items-center gap-1.5 h-11 sm:h-9 px-3 text-xs font-semibold text-crimson-700 border border-crimson-200 rounded-lg hover:bg-crimson-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete {selectedCount}…
        </button>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center h-9 px-2 text-xs font-semibold text-slate-500 hover:text-navy-700 underline-offset-2 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
