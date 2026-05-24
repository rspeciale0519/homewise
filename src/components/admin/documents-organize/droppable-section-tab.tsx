"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { DocumentSection, OrganizeTab } from "@/app/admin/documents/types";

export const SECTION_TAB_DROP_PREFIX = "tab::";

export function tabDroppableId(section: DocumentSection): string {
  return `${SECTION_TAB_DROP_PREFIX}${section}`;
}

interface DroppableSectionTabProps {
  tab: { key: OrganizeTab; label: string };
  isActive: boolean;
  count: number;
  acceptsDrop: boolean;
  onSelect: (key: OrganizeTab) => void;
}

export function DroppableSectionTab({
  tab,
  isActive,
  count,
  acceptsDrop,
  onSelect,
}: DroppableSectionTabProps) {
  const isSection = tab.key !== "uncategorized";
  const { setNodeRef, isOver } = useDroppable({
    id: tabDroppableId(tab.key as DocumentSection),
    data: { type: "section-tab-drop", section: tab.key },
    disabled: !acceptsDrop || !isSection,
  });

  return (
    <button
      ref={isSection ? setNodeRef : undefined}
      type="button"
      onClick={() => onSelect(tab.key)}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600",
        isActive
          ? "bg-white text-navy-700 shadow-sm"
          : "text-slate-500 hover:text-navy-600",
        isOver && acceptsDrop && "ring-2 ring-crimson-500 ring-offset-2 scale-105 shadow-lg bg-crimson-50",
      )}
    >
      {tab.label}
      <span
        className={cn(
          "text-[11px] font-semibold px-1.5 py-0.5 rounded-full transition-colors",
          isActive
            ? "bg-crimson-50 text-crimson-600"
            : "bg-slate-200/60 text-slate-400",
        )}
      >
        {count}
      </span>
    </button>
  );
}
