"use client";

import { useCallback, useEffect, useState } from "react";

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
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", days: -1 },
] as const;

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function thisYearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export function TeamPerformanceView() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(formatDate(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(formatDate(new Date()));
  const [sortBy, setSortBy] = useState<SortKey>("closings");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/team-performance?from=${from}&to=${to}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePreset = (days: number) => {
    if (days === -1) {
      setFrom(thisYearStart());
    } else {
      setFrom(formatDate(new Date(Date.now() - days * 86400000)));
    }
    setTo(formatDate(new Date()));
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy-700">Team Performance</h1>
          <p className="text-sm text-slate-500">Compare agent metrics across your team</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {/* Custom Date Range */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
        <span className="text-slate-400 text-sm">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Loading metrics...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Team Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            <TotalCard label="Leads" value={data.totals.leads} />
            <TotalCard label="Contacts" value={data.totals.contacts} />
            <TotalCard label="Showings" value={data.totals.showings} />
            <TotalCard label="Offers" value={data.totals.offers} />
            <TotalCard label="Closings" value={data.totals.closings} />
            <TotalCard label="Pipeline" value={`$${(data.totals.pipelineValue / 1000).toFixed(0)}k`} />
            <TotalCard label="Emails Sent" value={data.totals.emailsSent} />
            <TotalCard label="Email Opens" value={data.totals.emailOpens} />
          </div>

          {/* Agent Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-600 overflow-hidden shrink-0">
                            {agent.photoUrl ? (
                              <img src={agent.photoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              `${agent.firstName[0]}${agent.lastName[0]}`
                            )}
                          </div>
                          <span className="font-medium text-navy-700 whitespace-nowrap">
                            {agent.firstName} {agent.lastName}
                          </span>
                        </div>
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

            {sorted.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No active agents found.</p>
              </div>
            )}
          </div>

          {/* Visual Bar Chart Comparison */}
          {sorted.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-navy-700 mb-4">Closings by Agent</h2>
              <div className="space-y-3">
                {sorted
                  .slice()
                  .sort((a, b) => b.closings - a.closings)
                  .map((agent) => (
                    <div key={agent.agentId} className="flex items-center gap-3">
                      <span className="w-32 text-sm text-slate-600 truncate">
                        {agent.firstName} {agent.lastName[0]}.
                      </span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-navy-600 rounded-full transition-all duration-500"
                          style={{ width: `${maxForMetric("closings") > 0 ? (agent.closings / maxForMetric("closings")) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-8 text-sm font-semibold text-navy-700 text-right">{agent.closings}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
      <p className="text-lg font-bold text-navy-700">{value}</p>
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
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
  const bgColors = {
    navy: "bg-navy-100",
    green: "bg-green-100",
    amber: "bg-amber-100",
  };
  const textColors = {
    navy: "text-navy-700",
    green: "text-green-700",
    amber: "text-amber-700",
  };

  return (
    <td className="px-4 py-3 text-right">
      <div className="flex items-center justify-end gap-2">
        <div className={`w-12 h-1.5 rounded-full ${bgColors[accent]} overflow-hidden`}>
          <div
            className={`h-full rounded-full ${accent === "navy" ? "bg-navy-500" : accent === "green" ? "bg-green-500" : "bg-amber-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-medium ${textColors[accent]}`}>{value}</span>
      </div>
    </td>
  );
}
