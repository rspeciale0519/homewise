"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SubscriptionItem {
  id: string;
  productType: string;
  productName: string;
}

interface AgentSubscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  items: SubscriptionItem[];
}

interface BillingAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  subscription: AgentSubscription | null;
  stripeCustomer: { stripeCustomerId: string } | null;
}

const STATUS_FILTERS = ["all", "active", "trialing", "past_due", "canceled"] as const;

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  trialing: { bg: "bg-amber-50", text: "text-amber-700", label: "Trialing" },
  past_due: { bg: "bg-red-50", text: "text-red-700", label: "Past Due" },
  canceled: { bg: "bg-slate-100", text: "text-slate-500", label: "Canceled" },
  none: { bg: "bg-slate-50", text: "text-slate-400", label: "No Sub" },
};

function StatusBadge({ status }: { status: string }) {
  const fallback = { bg: "bg-slate-50", text: "text-slate-400", label: "No Sub" };
  const badge = statusBadge[status] ?? fallback;
  return (
    <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", badge.bg, badge.text)}>
      {badge.label}
    </span>
  );
}

export function AgentBillingTable() {
  const [agents, setAgents] = useState<BillingAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchAgents = useCallback(async (s: string, sf: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: String(perPage) });
      if (s) params.set("search", s);
      if (sf !== "all") params.set("status", sf);

      const res = await fetch(`/api/admin/billing/agents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Load on mount
  if (!initialized && !loading) {
    fetchAgents(search, statusFilter, page);
  }

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchAgents(value, statusFilter, 1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    fetchAgents(search, value, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchAgents(search, statusFilter, p);
  };

  if (!initialized) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleStatusFilter(f)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap",
                statusFilter === f
                  ? "bg-navy-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {f === "past_due" ? "Past Due" : f}
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
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bundles</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period End</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-navy-700">
                    {agent.firstName} {agent.lastName}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{agent.email ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={agent.subscription?.status ?? "none"} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.subscription?.items.map((item) => (
                        <span
                          key={item.id}
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                          {item.productName}
                        </span>
                      )) ?? <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {agent.subscription
                      ? new Date(agent.subscription.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/billing/agents/${agent.id}`}
                      className="text-xs font-medium text-navy-600 hover:text-navy-800 transition-colors"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No agents found matching your filters.
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
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
