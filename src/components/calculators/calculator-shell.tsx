"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

interface CalculatorShellProps {
  title: string;
  description?: string;
  inputs: React.ReactNode;
  results: React.ReactNode;
  overviewResults?: React.ReactNode;
  showTabs?: boolean;
  instructions?: string;
}

export function CalculatorShell({
  title,
  description,
  inputs,
  results,
  overviewResults,
  showTabs = false,
  instructions,
}: CalculatorShellProps) {
  const [activeTab, setActiveTab] = useState<"graph" | "overview">("graph");

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Back link */}
      <div className="px-6 pt-4">
        <Link
          href="/mortgage-calculator"
          className="inline-flex items-center gap-1 text-xs text-crimson-600 hover:text-crimson-700 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Calculators
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Inputs */}
        <div className="p-6 sm:p-8">
          <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-slate-400 mb-6">{description}</p>
          )}
          <div className="space-y-5">{inputs}</div>

          {instructions && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-navy-600 uppercase tracking-wider mb-2">
                Instructions
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">{instructions}</p>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="bg-navy-700 p-6 sm:p-8">
          {showTabs && overviewResults && (
            <div className="flex items-center justify-center gap-1 mb-4">
              <TabButton
                active={activeTab === "graph"}
                onClick={() => setActiveTab("graph")}
              >
                Graph
              </TabButton>
              <span className="text-navy-500 mx-1">|</span>
              <TabButton
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </TabButton>
            </div>
          )}

          {activeTab === "graph" || !overviewResults ? results : overviewResults}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs font-semibold uppercase tracking-wider transition-colors",
        active ? "text-white" : "text-navy-400 hover:text-navy-200"
      )}
    >
      {children}
    </button>
  );
}
