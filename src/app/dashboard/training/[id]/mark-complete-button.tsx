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

  async function handleMarkComplete() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/training/${contentId}/complete`,
        { method: "POST" },
      );
      if (res.ok) {
        setCompleted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        Completed
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleMarkComplete}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
    >
      {loading ? "Saving..." : "Mark Complete"}
    </button>
  );
}
