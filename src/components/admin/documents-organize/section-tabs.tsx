"use client";

import type { OrganizeTab } from "@/app/admin/documents/types";

interface SectionTabsProps {
  tabs: Array<{ key: OrganizeTab; label: string }>;
  activeTab: OrganizeTab;
  onSelect: (tab: OrganizeTab) => void;
  counts: Record<OrganizeTab, number>;
}

export function SectionTabs({
  tabs,
  activeTab,
  onSelect,
  counts,
}: SectionTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-fit">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 ${
              isActive
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-500 hover:text-navy-600"
            }`}
          >
            {tab.label}
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                isActive
                  ? "bg-crimson-50 text-crimson-600"
                  : "bg-slate-200/60 text-slate-400"
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
