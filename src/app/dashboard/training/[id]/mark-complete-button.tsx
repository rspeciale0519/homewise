"use client";

import { useState } from "react";

interface MarkCompleteButtonProps {
  contentId: string;
  completed: boolean;
}

export function MarkCompleteButton({
  contentId,
  completed: initialCompleted,
}: MarkCompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/training/${contentId}/complete`,
        { method: completed ? "DELETE" : "POST" },
      );
      if (res.ok) {
        setCompleted(!completed);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 text-sm font-semibold bg-slate-100 text-slate-400"
      >
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving...
      </button>
    );
  }

  if (completed) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className="group inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 text-sm font-semibold bg-green-50 text-green-700 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200 cursor-pointer min-w-[180px] whitespace-nowrap"
      >
        {/* Checkmark — visible by default, hidden on hover */}
        <svg
          className="h-4.5 w-4.5 transition-all duration-200 group-hover:hidden"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {/* Undo arrow — hidden by default, visible on hover */}
        <svg
          className="h-4.5 w-4.5 hidden group-hover:block transition-all duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
        <span className="group-hover:hidden">Completed</span>
        <span className="hidden group-hover:inline">Mark Incomplete</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex items-center gap-2.5 rounded-lg bg-navy-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 active:bg-navy-800 transition-colors shadow-sm hover:shadow-md"
    >
      Mark Complete
    </button>
  );
}
