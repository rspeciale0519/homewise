"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface AgentFiltersProps {
  availableLanguages: string[];
  activeLetters: string[];
  currentLanguage?: string;
  currentLetter?: string;
  currentSearch?: string;
  totalCount: number;
}

export function AgentFilters({
  availableLanguages,
  activeLetters,
  currentLanguage,
  currentLetter,
  currentSearch,
  totalCount,
}: AgentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch ?? "");

  const updateParams = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    setSearchValue("");
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("search", searchValue.trim() || undefined);
  };

  const hasFilters = currentLanguage || currentLetter || currentSearch;

  return (
    <div className="space-y-5">
      {/* Search + Language row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                updateParams("search", undefined);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* Language select */}
        <div className="relative sm:w-56">
          <select
            value={currentLanguage ?? ""}
            onChange={(e) => updateParams("language", e.target.value || undefined)}
            className="w-full h-11 pl-4 pr-10 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow cursor-pointer"
          >
            <option value="">All Languages</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* A–Z Letter bar */}
      <div className="flex flex-wrap items-center gap-0.5">
        <button
          onClick={() => updateParams("letter", undefined)}
          className={cn(
            "h-9 px-3.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200",
            !currentLetter
              ? "bg-navy-600 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-navy-700"
          )}
        >
          All
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        {ALPHABET.map((letter) => {
          const isActive = currentLetter?.toUpperCase() === letter;
          const hasAgents = activeLetters.includes(letter);

          return (
            <button
              key={letter}
              onClick={() => updateParams("letter", isActive ? undefined : letter)}
              disabled={!hasAgents && !isActive}
              className={cn(
                "h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center",
                isActive
                  ? "bg-crimson-600 text-white shadow-sm"
                  : hasAgents
                    ? "text-navy-600 hover:bg-navy-50 hover:text-navy-800"
                    : "text-slate-300 cursor-not-allowed"
              )}
              aria-label={`Filter by last name starting with ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Active filter chips + count */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className={cn("flex items-center gap-2 text-sm transition-opacity", isPending && "opacity-50")}>
          <span className="text-slate-500">
            Showing <span className="font-semibold text-navy-700">{totalCount}</span>{" "}
            {totalCount === 1 ? "agent" : "agents"}
          </span>
        </div>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-crimson-600 hover:text-crimson-700 transition-colors flex items-center gap-1"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
