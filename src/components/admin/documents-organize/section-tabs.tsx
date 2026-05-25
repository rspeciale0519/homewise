"use client";

import type { OrganizeTab } from "@/app/admin/documents/types";
import { DroppableSectionTab } from "./droppable-section-tab";

interface SectionTabsProps {
  tabs: Array<{ key: OrganizeTab; label: string }>;
  activeTab: OrganizeTab;
  onSelect: (tab: OrganizeTab) => void;
  counts: Record<OrganizeTab, number>;
  acceptsBulkDrop: boolean;
}

export function SectionTabs({
  tabs,
  activeTab,
  onSelect,
  counts,
  acceptsBulkDrop,
}: SectionTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-fit">
      {tabs.map((tab) => (
        <DroppableSectionTab
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          count={counts[tab.key]}
          acceptsDrop={acceptsBulkDrop && tab.key !== "uncategorized"}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
