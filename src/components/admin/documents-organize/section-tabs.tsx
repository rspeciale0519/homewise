"use client";

import type { OrganizeTab } from "@/app/admin/documents/types";
import { DroppableSectionTab } from "./droppable-section-tab";

interface SectionTabsProps {
  tabs: Array<{ key: OrganizeTab; label: string }>;
  activeTab: OrganizeTab;
  onSelect: (tab: OrganizeTab) => void;
  counts: Record<OrganizeTab, number>;
  acceptsBulkDrop: boolean;
  // When true, the Uncategorized tab is also a valid bulk drop target
  // (used for section-bulk drags so the admin can remove cards from a
  // section by dragging onto Uncategorized).
  uncategorizedAcceptsBulkDrop?: boolean;
}

export function SectionTabs({
  tabs,
  activeTab,
  onSelect,
  counts,
  acceptsBulkDrop,
  uncategorizedAcceptsBulkDrop = false,
}: SectionTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-fit">
      {tabs.map((tab) => {
        // The currently active tab is never a self-drop target. Section
        // tabs accept bulk drops by default; Uncategorized only accepts
        // when explicitly enabled by the drag intent (section-bulk).
        const accepts =
          acceptsBulkDrop &&
          tab.key !== activeTab &&
          (tab.key !== "uncategorized" || uncategorizedAcceptsBulkDrop);
        return (
          <DroppableSectionTab
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            count={counts[tab.key]}
            acceptsDrop={accepts}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}
