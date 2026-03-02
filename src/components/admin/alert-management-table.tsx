"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AlertUser {
  firstName: string;
  lastName: string;
  email: string;
}

interface AlertRow {
  id: string;
  email: string;
  name: string | null;
  cities: string[];
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
  active: boolean;
  createdAt: string;
  user: AlertUser | null;
}

const ACTIVE_FILTERS = ["all", "active", "inactive"] as const;

export function AlertManagementTable() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchAlerts = useCallback(async (s: string, af: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: String(perPage) });
      if (s) params.set("search", s);
      if (af !== "all") params.set("active", af === "active" ? "true" : "false");

      const res = await fetch(`/api/admin/alerts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(search, activeFilter, page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchAlerts(value, activeFilter, 1);
  };

  const handleActiveFilter = (value: string) => {
    setActiveFilter(value);
    setPage(1);
    fetchAlerts(search, value, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchAlerts(search, activeFilter, p);
  };

  const toggleActive = async (alertId: string, currentActive: boolean) => {
    const res = await fetch(`/api/admin/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !currentActive }),
    });

    if (res.ok) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, active: !currentActive } : a))
      );
    }
  };

  const formatPrice = (price: number | null) =>
    price != null ? `$${price.toLocaleString()}` : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
        />
        <div className="flex gap-1">
          {ACTIVE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleActiveFilter(f)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors",
                activeFilter === f
                  ? "bg-navy-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {f}
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
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cities</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price Range</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Beds</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 text-navy-700 font-medium">{alert.email}</td>
                  <td className="px-5 py-3 text-slate-500">{alert.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {alert.cities.map((city) => (
                        <span key={city} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-navy-50 text-navy-600">
                          {city}
                        </span>
                      ))}
                      {alert.cities.length === 0 && <span className="text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 tabular-nums">
                    {formatPrice(alert.minPrice)} – {formatPrice(alert.maxPrice)}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{alert.beds ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {alert.user ? `${alert.user.firstName} ${alert.user.lastName}` : "Guest"}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(alert.id, alert.active)}
                      className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full transition-colors",
                        alert.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      )}
                    >
                      {alert.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs tabular-nums">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    No property alerts found.
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
