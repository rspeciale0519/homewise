"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { DashboardView } from "@/lib/dashboard-view";
import { updateDashboardView } from "./dashboard-preference-actions";

interface DashboardPreferenceProps {
  initialView: DashboardView;
}

const OPTIONS: { value: DashboardView; label: string; description: string }[] = [
  {
    value: "client",
    label: "Client Dashboard",
    description: "Overview, favorites, and saved searches.",
  },
  {
    value: "agent",
    label: "Agent Dashboard",
    description: "Resources hub, documents, training, and billing.",
  },
];

export function DashboardPreference({ initialView }: DashboardPreferenceProps) {
  const [view, setView] = useState<DashboardView>(initialView);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSelect = (next: DashboardView) => {
    if (next === view || isPending) return;
    const previous = view;
    setView(next);
    setStatus("idle");
    setErrorMsg("");

    startTransition(async () => {
      const result = await updateDashboardView(next);
      if (result.ok) {
        setStatus("saved");
      } else {
        setView(previous);
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Default dashboard view"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {OPTIONS.map((option) => {
          const active = option.value === view;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={isPending}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "text-left p-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-navy-500",
                active
                  ? "border-navy-600 bg-navy-50/60 shadow-sm"
                  : "border-slate-200 bg-white hover:border-navy-200 hover:bg-slate-50",
                isPending && "opacity-60 cursor-wait",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    active ? "text-navy-700" : "text-slate-700",
                  )}
                >
                  {option.label}
                </span>
                {active && (
                  <span className="h-4 w-4 rounded-full bg-navy-600 flex items-center justify-center">
                    <svg
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      {status === "saved" && (
        <p className="text-xs text-emerald-600 font-medium">Preference saved.</p>
      )}
      {status === "error" && (
        <p className="text-xs text-crimson-600 font-medium">
          {errorMsg || "Could not save. Try again."}
        </p>
      )}
    </div>
  );
}
