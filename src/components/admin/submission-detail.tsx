"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  read: "bg-slate-100 text-slate-600 border-slate-200",
  archived: "bg-slate-50 text-slate-400 border-slate-200",
};

interface FieldDef {
  label: string;
  value: string | number | null | undefined;
}

interface SubmissionDetailProps {
  type: string;
  id: string;
  currentStatus: string;
  fields: FieldDef[];
}

export function SubmissionDetail({ type, id, currentStatus, fields }: SubmissionDetailProps) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/submissions/${type}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border", statusColors[status])}>
            {status}
          </span>
          <span className="text-xs text-slate-400 capitalize">{type} submission</span>
        </div>
        <div className="flex gap-1">
          {(["new", "read", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={saving || s === status}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                s === status
                  ? "bg-navy-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                saving && "opacity-50 cursor-not-allowed"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
          {fields.map((field) => (
            <div key={field.label} className={field.label === "Message" || field.label === "Bio" || field.label === "Comments" ? "sm:col-span-2" : ""}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{field.label}</p>
              <p className="text-sm text-navy-700 whitespace-pre-wrap">{field.value ?? "—"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-100">
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Submissions
        </Link>
      </div>
    </div>
  );
}
