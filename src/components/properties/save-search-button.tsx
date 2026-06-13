"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SaveSearchButton() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const entries = Array.from(searchParams.entries()).filter(([key]) => key !== "page");
  if (entries.length === 0) return null;

  const handleSave = async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    const filters: Record<string, string> = {};
    for (const [key, value] of entries) filters[key] = value;
    const parts = [
      filters.location,
      filters.beds ? `${filters.beds}+ beds` : null,
      filters.maxPrice ? `under $${Number(filters.maxPrice).toLocaleString()}` : null,
    ].filter(Boolean);
    const name = parts.length > 0 ? parts.join(" · ") : "Property search";
    try {
      const res = await fetch("/api/user/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filters }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "saved") {
    return (
      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Search saved
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={status === "saving"}
      className="text-xs font-medium text-navy-600 hover:text-navy-700 transition-colors flex items-center gap-1 disabled:opacity-50"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
        />
      </svg>
      {status === "error" ? "Retry save" : "Save search"}
    </button>
  );
}
