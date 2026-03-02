"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SubmissionRow {
  id: string;
  type: "contact" | "evaluation" | "buyer";
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

const TYPE_TABS = ["all", "contact", "evaluation", "buyer"] as const;
const STATUS_FILTERS = ["all", "new", "read", "archived"] as const;

const typeLabels: Record<string, { label: string; color: string }> = {
  contact: { label: "Contact", color: "bg-navy-50 text-navy-700" },
  evaluation: { label: "Evaluation", color: "bg-amber-50 text-amber-700" },
  buyer: { label: "Buyer", color: "bg-crimson-50 text-crimson-700" },
};

const statusColors: Record<string, string> = {
  new: "bg-emerald-50 text-emerald-700",
  read: "bg-slate-100 text-slate-600",
  archived: "bg-slate-50 text-slate-400",
};

export function SubmissionTable() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchSubmissions = useCallback(async (t: string, s: string, st: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: String(perPage) });
      if (t !== "all") params.set("type", t);
      if (s) params.set("search", s);
      if (st !== "all") params.set("status", st);

      const res = await fetch(`/api/admin/submissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions(typeFilter, search, statusFilter, page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setPage(1);
    fetchSubmissions(value, search, statusFilter, 1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    fetchSubmissions(typeFilter, search, value, 1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchSubmissions(typeFilter, value, statusFilter, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchSubmissions(typeFilter, search, statusFilter, p);
  };

  const handleStatusChange = async (type: string, id: string, newStatus: string) => {
    const res = await fetch(`/api/admin/submissions/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id && s.type === type ? { ...s, status: newStatus } : s))
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {TYPE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => handleTypeFilter(t)}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors",
              typeFilter === t
                ? "bg-navy-600 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            {t === "all" ? "All Types" : t}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
        />
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-crimson-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-opacity",
        loading && "opacity-60"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {submissions.map((sub) => {
                const typeInfo = typeLabels[sub.type];
                return (
                  <tr key={`${sub.type}-${sub.id}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", typeInfo?.color)}>
                        {typeInfo?.label ?? sub.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-navy-700">
                      <Link href={`/admin/submissions/${sub.type}/${sub.id}`} className="hover:underline">
                        {sub.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{sub.email}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", statusColors[sub.status])}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs tabular-nums">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={sub.status}
                        onChange={(e) => handleStatusChange(sub.type, sub.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-navy-200"
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {submissions.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No submissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button onClick={() => handlePage(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
            <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
