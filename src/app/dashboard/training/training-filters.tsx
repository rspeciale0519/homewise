"use client";

import { useCallback } from "react";

interface TrainingFiltersProps {
  categories: string[];
  types: string[];
}

export function TrainingFilters({ categories, types }: TrainingFiltersProps) {
  const handleFilter = useCallback((filterType: "category" | "type", value: string) => {
    const grid = document.getElementById("modules-grid");
    if (!grid) return;

    const items = grid.querySelectorAll<HTMLElement>("[data-category]");
    items.forEach((el) => {
      const catSelect = document.getElementById("filter-category") as HTMLSelectElement | null;
      const typeSelect = document.getElementById("filter-type") as HTMLSelectElement | null;

      const catVal = filterType === "category" ? value : (catSelect?.value ?? "all");
      const typeVal = filterType === "type" ? value : (typeSelect?.value ?? "all");

      const catMatch = catVal === "all" || el.dataset.category === catVal;
      const typeMatch = typeVal === "all" || el.dataset.type === typeVal;

      el.style.display = catMatch && typeMatch ? "" : "none";
    });
  }, []);

  const selectClass =
    "h-10 px-4 pr-9 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 transition-colors cursor-pointer";

  return (
    <div className="flex gap-3">
      <select
        id="filter-category"
        onChange={(e) => handleFilter("category", e.target.value)}
        className={selectClass}
      >
        <option value="all">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c.replace("_", " ")}</option>
        ))}
      </select>
      <select
        id="filter-type"
        onChange={(e) => handleFilter("type", e.target.value)}
        className={selectClass}
      >
        <option value="all">All Types</option>
        {types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
