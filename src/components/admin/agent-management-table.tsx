"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AgentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  designations: string[];
  active: boolean;
  createdAt: string;
}

interface AgentManagementTableProps {
  initialAgents: AgentRow[];
  initialTotal: number;
}

const ACTIVE_FILTERS = ["all", "active", "inactive"] as const;

export function AgentManagementTable({ initialAgents, initialTotal }: AgentManagementTableProps) {
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchAgents = useCallback(async (s: string, af: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: String(perPage) });
      if (s) params.set("search", s);
      if (af !== "all") params.set("active", af === "active" ? "true" : "false");

      const res = await fetch(`/api/admin/agents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchAgents(value, activeFilter, 1);
  };

  const handleActiveFilter = (value: string) => {
    setActiveFilter(value);
    setPage(1);
    fetchAgents(search, value, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchAgents(search, activeFilter, p);
  };

  const toggleActive = async (agentId: string, currentActive: boolean) => {
    const res = await fetch(`/api/admin/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !currentActive }),
    });

    if (res.ok) {
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, active: !currentActive } : a))
      );
    }
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
          <Link
            href="/admin/agents/new"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-crimson-600 text-white hover:bg-crimson-700 transition-colors"
          >
            + Add Agent
          </Link>
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
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Designations</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        {agent.photoUrl ? (
                          <Image
                            src={agent.photoUrl}
                            alt={`${agent.firstName} ${agent.lastName}`}
                            width={36}
                            height={36}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                            {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-navy-700">
                        {agent.firstName} {agent.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-xs text-slate-500">
                      {agent.email && <p>{agent.email}</p>}
                      {agent.phone && <p>{agent.phone}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.designations.map((d) => (
                        <span key={d} className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(agent.id, agent.active)}
                      className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full transition-colors",
                        agent.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      )}
                    >
                      {agent.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/agents/${agent.id}`}
                      className="text-xs font-medium text-navy-600 hover:text-navy-800 transition-colors"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    No agents found.
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
