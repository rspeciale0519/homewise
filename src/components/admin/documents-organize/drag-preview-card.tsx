"use client";

import type { AdminDocumentInCategory } from "@/app/admin/documents/types";

interface DragPreviewCardProps {
  document: AdminDocumentInCategory;
}

export function DragPreviewCard({ document }: DragPreviewCardProps) {
  const isMuted = !document.published;

  return (
    <div
      className={`flex items-start gap-4 p-4 pl-5 rounded-xl border bg-white shadow-2xl ring-2 ring-navy-400/30 pointer-events-none cursor-grabbing max-w-sm ${
        isMuted ? "border-slate-200" : "border-crimson-200"
      }`}
      style={{ rotate: "-1deg" }}
    >
      <div className="shrink-0 mt-0.5">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            isMuted ? "bg-slate-50" : "bg-crimson-100"
          }`}
        >
          <svg
            className={`h-4 w-4 ${
              isMuted ? "text-slate-300" : "text-crimson-600"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            isMuted ? "text-slate-500" : "text-crimson-700"
          }`}
        >
          <span className="align-middle">{document.name}</span>
          {!document.published && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100 align-middle">
              Draft
            </span>
          )}
          {document.quickAccess && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 align-middle">
              Quick
            </span>
          )}
        </p>
        {document.description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
            {document.description}
          </p>
        )}
      </div>
    </div>
  );
}
