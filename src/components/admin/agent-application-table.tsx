"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ApplicationRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

const STATUS_FILTERS = ["pending", "approved", "rejected", "all"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-slate-100 text-slate-500",
};

export function AgentApplicationTable() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchApplications = useCallback(async (st: string, s: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: String(perPage), status: st });
      if (s) params.set("search", s);

      const res = await fetch(`/api/admin/agent-applications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications(statusFilter, search, page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    fetchApplications(value, search, 1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchApplications(statusFilter, value, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchApplications(statusFilter, search, p);
  };

  return (
    <div className="space-y-4">
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
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-navy-700">
                    <Link href={`/admin/agent-applications/${app.id}`} className="hover:underline">
                      {app.firstName} {app.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    <p>{app.email}</p>
                    {app.phone && <p>{app.phone}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", statusColors[app.status] ?? "bg-slate-100 text-slate-500")}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs tabular-nums">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/agent-applications/${app.id}`}
                      className="text-xs font-medium text-navy-600 hover:text-navy-800 transition-colors"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    No applications found.
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
