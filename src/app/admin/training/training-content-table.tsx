"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { TrainingItem } from "./types";
import type { UseTrainingSelectionResult } from "./use-training-selection";

interface TrainingContentTableProps {
  items: TrainingItem[];
  selection: UseTrainingSelectionResult;
  totalCount: number;
  onRowClick: (item: TrainingItem) => void;
  onTogglePublished: (item: TrainingItem) => void;
}

export function TrainingContentTable({
  items,
  selection,
  totalCount,
  onRowClick,
  onTogglePublished,
}: TrainingContentTableProps) {
  const masterState: boolean | "indeterminate" = selection.isAllSelected
    ? true
    : selection.isIndeterminate
      ? "indeterminate"
      : false;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="py-3 px-3 w-10">
                <Checkbox
                  checked={masterState}
                  aria-label={
                    selection.isAllSelected
                      ? "Deselect all"
                      : "Select all visible"
                  }
                  onClick={selection.toggleAll}
                />
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                Title
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                Category
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                Type
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                Audience
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const checked = selection.isSelected(item.id);
              return (
                <tr
                  key={item.id}
                  onClick={() => onRowClick(item)}
                  className={`border-b border-slate-50 cursor-pointer transition-colors ${
                    checked ? "bg-crimson-50/40" : "hover:bg-slate-50"
                  }`}
                  aria-selected={checked}
                >
                  <td
                    className="py-3 px-3 w-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={checked}
                      aria-label={
                        checked
                          ? `Deselect ${item.title}`
                          : `Select ${item.title}`
                      }
                      onClick={(e: React.MouseEvent) => {
                        selection.toggleOne(item.id, {
                          shiftKey: e.shiftKey,
                          ctrlKey: e.ctrlKey,
                          metaKey: e.metaKey,
                        });
                      }}
                    />
                  </td>
                  <td className="py-3 px-4 font-medium text-navy-700 max-w-[200px] truncate">
                    {item.title}
                  </td>
                  <td className="py-3 px-4 text-slate-600 capitalize">
                    {item.category.replace("_", " ")}
                  </td>
                  <td className="py-3 px-4 text-slate-600 capitalize">
                    {item.type}
                  </td>
                  <td className="py-3 px-4 text-slate-600 capitalize">
                    {item.audience.replace("_", " ")}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePublished(item);
                      }}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        item.published
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {item.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-slate-400">
                  {totalCount === 0
                    ? "No content yet"
                    : "No results match your filters"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
