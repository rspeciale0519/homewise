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

  if (completed) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {loading ? "Updating..." : "Completed — Undo"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
    >
      {loading ? "Saving..." : "Mark Complete"}
    </button>
  );
}
