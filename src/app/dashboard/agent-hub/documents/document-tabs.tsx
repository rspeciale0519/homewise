"use client";

import { useState } from "react";
import { DocumentList } from "@/components/content/document-list";
import type { LibrarySection } from "@/types/document-library";
import { cn } from "@/lib/utils";

interface DocumentTabsProps {
  tabs: LibrarySection[];
}

export function DocumentTabs({ tabs }: DocumentTabsProps) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActive(i)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
              active === i
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-500 hover:text-navy-600",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[11px] font-semibold px-1.5 py-0.5 rounded-full transition-colors",
                active === i
                  ? "bg-crimson-50 text-crimson-600"
                  : "bg-slate-200/60 text-slate-400",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {tabs[active] && <DocumentList categories={tabs[active].categories} />}
    </div>
  );
}
