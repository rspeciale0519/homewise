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
    <div className="flex gap-3">
      <select
        id="filter-category"
        onChange={(e) => handleFilter("category", e.target.value)}
        className="h-10 px-4 pr-8 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-navy-600 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
      >
        <option value="all">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c.replace("_", " ")}</option>
        ))}
      </select>
      <select
        id="filter-type"
        onChange={(e) => handleFilter("type", e.target.value)}
        className="h-10 px-4 pr-8 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-navy-600 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
      >
        <option value="all">All Types</option>
        {types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
