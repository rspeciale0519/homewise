"use client";

import { useState } from "react";
import Link from "next/link";
import type { SavedSearch } from "@/types/user";
import { cn } from "@/lib/utils";

interface SavedSearchListProps {
  searches: SavedSearch[];
}

export function SavedSearchList({ searches: initial }: SavedSearchListProps) {
  const [searches, setSearches] = useState(initial);

  const toggleAlert = async (id: string, current: boolean) => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, alertEnabled: !current } : s))
    );
    await fetch(`/api/user/saved-searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertEnabled: !current }),
    });
  };

  const handleDelete = async (id: string) => {
    setSearches((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/user/saved-searches/${id}`, { method: "DELETE" });
  };

  const buildSearchUrl = (filters: Record<string, unknown>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
    return `/properties?${params.toString()}`;
  };

  const formatFilters = (filters: Record<string, unknown>) => {
    const parts: string[] = [];
    if (filters.city) parts.push(String(filters.city));
    if (filters.minPrice || filters.maxPrice) {
      const min = filters.minPrice ? `$${Number(filters.minPrice).toLocaleString()}` : "Any";
      const max = filters.maxPrice ? `$${Number(filters.maxPrice).toLocaleString()}` : "Any";
      parts.push(`${min} – ${max}`);
    }
    if (filters.beds) parts.push(`${filters.beds}+ beds`);
    if (filters.baths) parts.push(`${filters.baths}+ baths`);
    return parts.length > 0 ? parts.join(" · ") : "All properties";
  };

  return (
    <div className="space-y-3">
      {searches.map((search) => (
        <div
          key={search.id}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-navy-700 truncate">{search.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{formatFilters(search.filters)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={buildSearchUrl(search.filters)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-50 text-navy-600 hover:bg-navy-100 transition-colors"
              >
                Run Search
              </Link>
              <button
                onClick={() => handleDelete(search.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 transition-colors"
                aria-label="Delete search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>

          {/* Alert toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <span className="text-xs text-slate-500">Email alerts</span>
            <button
              onClick={() => toggleAlert(search.id, search.alertEnabled)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                search.alertEnabled ? "bg-navy-600" : "bg-slate-200"
              )}
              aria-label={search.alertEnabled ? "Disable alerts" : "Enable alerts"}
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
                  search.alertEnabled ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
