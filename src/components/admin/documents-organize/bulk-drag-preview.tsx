"use client";

import { FileText } from "lucide-react";
import type { AdminUncategorizedDoc } from "@/app/admin/documents/types";

interface BulkDragPreviewProps {
  docs: AdminUncategorizedDoc[];
}

export function BulkDragPreview({ docs }: BulkDragPreviewProps) {
  const count = docs.length;
  const primary = docs[0];
  if (!primary) return null;

  return (
    <div className="relative pointer-events-none w-56">
      {count > 2 && (
        <div className="absolute top-2 left-2 w-full h-full rounded-xl border border-slate-300 bg-white shadow-md" />
      )}
      {count > 1 && (
        <div className="absolute top-1 left-1 w-full h-full rounded-xl border border-slate-300 bg-white shadow-md" />
      )}
      <div className="relative px-3 py-2 rounded-xl border border-crimson-400 bg-white shadow-2xl rotate-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
          <p className="text-sm font-medium text-navy-700 truncate">
            {primary.name}
          </p>
        </div>
        {count > 1 && (
          <p className="text-[11px] text-slate-500 mt-0.5 ml-6 truncate">
            + {count - 1} more
          </p>
        )}
        {count > 1 && (
          <div className="absolute -top-2 -right-2 inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full bg-crimson-600 text-white text-xs font-bold shadow-md">
            {count}
          </div>
        )}
      </div>
    </div>
  );
}
