"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface DashboardMetrics {
  activeCount: number;
  trialingCount: number;
  pastDueCount: number;
  canceledCount: number;
  totalMrr: number;
}

interface PastDueAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  subscription: {
    status: string;
    currentPeriodEnd: string;
  } | null;
}

interface DashboardData {
  metrics: DashboardMetrics;
  pastDueAgents: PastDueAgent[];
  revenueByBundle: Record<string, number>;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function MetricCard({
  label,
  value,
  subLabel,
  accent,
}: {
  label: string;
  value: string | number;
  subLabel?: string;
  accent: "navy" | "crimson" | "green" | "amber" | "red" | "slate";
}) {
  const colorMap = {
    navy: "bg-navy-50 text-navy-600",
    crimson: "bg-crimson-50 text-crimson-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-50 text-slate-500",
  };

  return (
    <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${colorMap[accent]}`}>
        <span className="text-lg font-bold">{typeof value === "number" ? value : "$"}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-navy-700">{value}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          {subLabel && (
            <span className="text-[10px] font-semibold text-crimson-600 bg-crimson-50 px-1.5 py-0.5 rounded-full">
              {subLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function RevenueDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/dashboard");
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { metrics, pastDueAgents, revenueByBundle } = data;
  const totalSubscribers = metrics.activeCount + metrics.trialingCount;
  const arr = metrics.totalMrr * 12;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="MRR" value={formatCurrency(metrics.totalMrr)} accent="navy" />
        <MetricCard label="ARR" value={formatCurrency(arr)} accent="navy" />
        <MetricCard label="Active Subscribers" value={totalSubscribers} accent="green" />
        <MetricCard label="Trialing" value={metrics.trialingCount} accent="amber" />
        <MetricCard
          label="Past Due"
          value={metrics.pastDueCount}
          accent={metrics.pastDueCount > 0 ? "red" : "slate"}
        />
        <MetricCard label="Canceled" value={metrics.canceledCount} accent="slate" />
      </div>

      {Object.keys(revenueByBundle).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-navy-700">Revenue by Bundle</h2>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {Object.entries(revenueByBundle)
                .sort(([, a], [, b]) => b - a)
                .map(([bundleType, mrr]) => (
                  <div key={bundleType} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy-700 capitalize">{bundleType}</span>
                    <span className="text-sm font-bold text-navy-700">{formatCurrency(mrr)}/mo</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-navy-700">Past Due Agents</h2>
          <p className="text-xs text-slate-400 mt-0.5">Agents with overdue payments requiring attention</p>
        </div>
        {pastDueAgents.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            No past-due agents. All payments are current.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period End</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pastDueAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-navy-700">
                      {agent.firstName} {agent.lastName}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{agent.email ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {agent.subscription
                        ? new Date(agent.subscription.currentPeriodEnd).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/billing/agents/${agent.id}`}
                        className="text-xs font-medium text-navy-600 hover:text-navy-800 transition-colors"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
