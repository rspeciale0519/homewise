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
      const catMatch = filterType === "category" ? (value === "all" || el.dataset.category === value) : true;
      const typeMatch = filterType === "type" ? (value === "all" || el.dataset.type === value) : true;

      // Check the other filter's current value
      const catSelect = document.getElementById("filter-category") as HTMLSelectElement | null;
      const typeSelect = document.getElementById("filter-type") as HTMLSelectElement | null;
      const otherCatMatch = catSelect ? (catSelect.value === "all" || el.dataset.category === catSelect.value) : true;
      const otherTypeMatch = typeSelect ? (typeSelect.value === "all" || el.dataset.type === typeSelect.value) : true;

      const show = filterType === "category"
        ? catMatch && otherTypeMatch
        : otherCatMatch && typeMatch;

      el.style.display = show ? "" : "none";
    });
  }, []);

  return (
    <div className="flex gap-2">
      <select
        id="filter-category"
        onChange={(e) => handleFilter("category", e.target.value)}
        className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-navy-600"
      >
        <option value="all">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c.replace("_", " ")}</option>
        ))}
      </select>
      <select
        id="filter-type"
        onChange={(e) => handleFilter("type", e.target.value)}
        className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-navy-600"
      >
        <option value="all">All Types</option>
        {types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
