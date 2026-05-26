"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { DocumentSection } from "@/app/admin/documents/types";

const SECTION_LABELS: Record<DocumentSection, string> = {
  office: "Office",
  listing: "Listing",
  sales: "Sales",
};

interface SectionSelectAllStripProps {
  section: DocumentSection;
  totalVisible: number;
  selectedInSection: number;
  onToggleAll: () => void;
  onClear: () => void;
}

export function SectionSelectAllStrip({
  section,
  totalVisible,
  selectedInSection,
  onToggleAll,
  onClear,
}: SectionSelectAllStripProps) {
  if (totalVisible === 0) return null;

  const label = SECTION_LABELS[section];
  const allSelected = selectedInSection === totalVisible;
  const someSelected = selectedInSection > 0;
  const state: boolean | "indeterminate" = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false;

  return (
    <div
      role="toolbar"
      aria-label={`${label} selection`}
      className="flex items-center gap-3 px-3 sm:px-4 py-2.5 mb-4 rounded-xl border border-slate-100 bg-slate-50/60"
    >
      <Checkbox
        checked={state}
        aria-label={
          allSelected
            ? `Deselect all in ${label}`
            : `Select all in ${label}`
        }
        onClick={onToggleAll}
      />
      <p className="text-xs font-semibold text-slate-600 flex-1 min-w-0 truncate">
        {someSelected
          ? `${selectedInSection} selected in ${label}`
          : `Select all in ${label} (${totalVisible})`}
      </p>
      {someSelected && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center h-9 px-2 text-xs font-semibold text-slate-500 hover:text-navy-700 underline-offset-2 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
        >
          Clear
        </button>
      )}
    </div>
  );
}
