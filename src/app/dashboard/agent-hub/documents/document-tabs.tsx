"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DocumentList } from "@/components/content/document-list";
import type { DocumentSection, LibrarySection } from "@/types/document-library";
import { cn } from "@/lib/utils";

interface DocumentTabsProps {
  tabs: LibrarySection[];
}

const VALID_TABS: ReadonlyArray<DocumentSection> = ["office", "listing", "sales"];

function isValidTab(value: string | null): value is DocumentSection {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

export function DocumentTabs({ tabs }: DocumentTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const activeKey: DocumentSection = isValidTab(tabFromUrl)
    ? tabFromUrl
    : tabs[0]?.key ?? "office";

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === activeKey),
  );

  const setActive = useCallback(
    (key: DocumentSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div>
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-white text-navy-700 shadow-sm"
                  : "text-slate-500 hover:text-navy-600",
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
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {tabs[activeIndex] && (
        <DocumentList categories={tabs[activeIndex].categories} />
      )}
    </div>
  );
}
