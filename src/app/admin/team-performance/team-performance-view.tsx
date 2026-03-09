"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface AgentMetrics {
  agentId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  leads: number;
  contacts: number;
  showings: number;
  offers: number;
  closings: number;
  pipelineValue: number;
  emailsSent: number;
  emailOpens: number;
  avgScore: number;
}

interface Totals {
  leads: number;
  contacts: number;
  showings: number;
  offers: number;
  closings: number;
  pipelineValue: number;
  emailsSent: number;
  emailOpens: number;
}

interface PerformanceData {
  agents: AgentMetrics[];
  totals: Totals;
  dateFrom: string;
  dateTo: string;
}

type SortKey = keyof Pick<AgentMetrics, "leads" | "contacts" | "showings" | "offers" | "closings" | "pipelineValue" | "emailsSent" | "avgScore">;

const PRESET_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "YTD", days: -1 },
] as const;

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function daysAgo(days: number): string {
  return formatDate(new Date(Date.now() - days * 86400000));
}

function thisYearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

const INITIAL_FROM = daysAgo(30);
const INITIAL_TO = daysAgo(0);

export function TeamPerformanceView() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(INITIAL_FROM);
  const [to, setTo] = useState(INITIAL_TO);
  const [sortBy, setSortBy] = useState<SortKey>("closings");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/admin/team-performance?from=${from}&to=${to}`);
      if (!cancelled && res.ok) setData(await res.json());
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [from, to]);

  const handlePreset = (days: number) => {
    if (days === -1) {
      setFrom(thisYearStart());
    } else {
      setFrom(daysAgo(days));
    }
    setTo(daysAgo(0));
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const sorted = data?.agents.slice().sort((a, b) => {
    const diff = a[sortBy] - b[sortBy];
    return sortDir === "desc" ? -diff : diff;
  }) ?? [];

  const maxForMetric = (key: SortKey): number => {
    if (!data) return 1;
    return Math.max(...data.agents.map((a) => a[key]), 1);
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1.5">
            {PRESET_RANGES.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.days)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Loading metrics...</p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mb-6 sm:mb-8">
            <TotalCard label="Leads" value={data.totals.leads} />
            <TotalCard label="Contacts" value={data.totals.contacts} />
            <TotalCard label="Showings" value={data.totals.showings} />
            <TotalCard label="Offers" value={data.totals.offers} />
            <TotalCard label="Closings" value={data.totals.closings} />
            <TotalCard label="Pipeline" value={`$${(data.totals.pipelineValue / 1000).toFixed(0)}k`} />
            <TotalCard label="Emails" value={data.totals.emailsSent} />
            <TotalCard label="Opens" value={data.totals.emailOpens} />
          </div>

          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Agent</th>
                    <SortHeader label="Leads" field="leads" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Contacts" field="contacts" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Showings" field="showings" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Offers" field="offers" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Closings" field="closings" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Pipeline" field="pipelineValue" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Emails" field="emailsSent" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Avg Score" field="avgScore" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((agent) => (
                    <tr key={agent.agentId} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <AgentAvatar agent={agent} />
                      </td>
                      <MetricCell value={agent.leads} max={maxForMetric("leads")} />
                      <MetricCell value={agent.contacts} max={maxForMetric("contacts")} />
                      <MetricCell value={agent.showings} max={maxForMetric("showings")} />
                      <MetricCell value={agent.offers} max={maxForMetric("offers")} />
                      <MetricCell value={agent.closings} max={maxForMetric("closings")} accent="green" />
                      <td className="px-4 py-3 text-right font-medium text-navy-700">
                        ${(agent.pipelineValue / 1000).toFixed(0)}k
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-700">{agent.emailsSent}</span>
                        {agent.emailsSent > 0 && (
                          <span className="text-xs text-slate-400 ml-1">
                            ({Math.round((agent.emailOpens / agent.emailsSent) * 100)}%)
                          </span>
                        )}
                      </td>
                      <MetricCell value={agent.avgScore} max={100} accent="amber" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:hidden space-y-3 mb-8">
            {sorted.map((agent) => (
              <div key={agent.agentId} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <AgentAvatar agent={agent} />
                  <span className="text-lg font-bold text-navy-700">{agent.closings} <span className="text-xs font-normal text-slate-400">closings</span></span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <div><span className="text-slate-500 text-xs">Leads</span><p className="font-semibold text-navy-700">{agent.leads}</p></div>
                  <div><span className="text-slate-500 text-xs">Contacts</span><p className="font-semibold text-navy-700">{agent.contacts}</p></div>
                  <div><span className="text-slate-500 text-xs">Showings</span><p className="font-semibold text-navy-700">{agent.showings}</p></div>
                  <div><span className="text-slate-500 text-xs">Offers</span><p className="font-semibold text-navy-700">{agent.offers}</p></div>
                  <div><span className="text-slate-500 text-xs">Pipeline</span><p className="font-semibold text-navy-700">${(agent.pipelineValue / 1000).toFixed(0)}k</p></div>
                  <div><span className="text-slate-500 text-xs">Avg Score</span><p className="font-semibold text-amber-600">{agent.avgScore}</p></div>
                </div>
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy-500 rounded-full transition-all"
                    style={{ width: `${maxForMetric("closings") > 0 ? (agent.closings / maxForMetric("closings")) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {sorted.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500">No active agents found.</p>
            </div>
          )}

          {sorted.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="font-semibold text-navy-700 mb-4">Closings by Agent</h2>
              <div className="space-y-3">
                {sorted
                  .slice()
                  .sort((a, b) => b.closings - a.closings)
                  .map((agent) => (
                    <div key={agent.agentId} className="flex items-center gap-3">
                      <span className="w-24 sm:w-32 text-sm text-slate-600 truncate">
                        {agent.firstName} {agent.lastName[0]}.
                      </span>
                      <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-navy-500 to-navy-600 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(maxForMetric("closings") > 0 ? (agent.closings / maxForMetric("closings")) * 100 : 0, agent.closings > 0 ? 8 : 0)}%` }}
                        >
                          {agent.closings > 0 && (
                            <span className="text-[10px] font-bold text-white">{agent.closings}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function AgentAvatar({ agent }: { agent: AgentMetrics }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-600 overflow-hidden shrink-0">
        {agent.photoUrl ? (
          <Image src={agent.photoUrl} alt="" width={32} height={32} className="h-full w-full object-cover" />
        ) : (
          `${agent.firstName[0]}${agent.lastName[0]}`
        )}
      </div>
      <span className="font-medium text-navy-700 whitespace-nowrap text-sm">
        {agent.firstName} {agent.lastName}
      </span>
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 text-center">
      <p className="text-base sm:text-lg font-bold text-navy-700">{value}</p>
      <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function SortHeader({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortKey;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sortBy === field;
  return (
    <th
      className="px-4 py-3 text-right font-semibold text-slate-600 cursor-pointer hover:text-navy-700 select-none whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      {label}
      {active && <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>}
    </th>
  );
}

function MetricCell({
  value,
  max,
  accent = "navy",
}: {
  value: number;
  max: number;
  accent?: "navy" | "green" | "amber";
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const bgColors = { navy: "bg-navy-100", green: "bg-green-100", amber: "bg-amber-100" };
  const fgColors = { navy: "bg-navy-500", green: "bg-green-500", amber: "bg-amber-500" };
  const textColors = { navy: "text-navy-700", green: "text-green-700", amber: "text-amber-700" };

  return (
    <td className="px-4 py-3 text-right">
      <div className="flex items-center justify-end gap-2">
        <div className={`w-12 h-1.5 rounded-full ${bgColors[accent]} overflow-hidden`}>
          <div className={`h-full rounded-full ${fgColors[accent]}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`font-medium ${textColors[accent]} tabular-nums`}>{value}</span>
      </div>
    </td>
  );
}
