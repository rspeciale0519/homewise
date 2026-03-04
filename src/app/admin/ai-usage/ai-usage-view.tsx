"use client";

import { useCallback, useEffect, useState } from "react";

interface DailyData {
  day: string;
  calls: number;
  tokens: number;
}

interface FeatureData {
  feature: string;
  calls: number;
  tokens: number;
  avgLatency: number;
}

interface UsageData {
  totalCalls: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
  estimatedCost: number;
  daily: DailyData[];
  byFeature: FeatureData[];
}

const PERIODS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

const FEATURE_LABELS: Record<string, string> = {
  chat: "Chat Widget",
  "search-assistant": "Search Assistant",
  "mortgage-advisor": "Mortgage Advisor",
  "listing-description": "Listing Description",
  "listing-insights": "Listing Insights",
  "home-valuation": "Home Valuation",
  "market-insights": "Market Insights",
  "lead-scoring": "Lead Scoring",
  "follow-up-draft": "Follow-Up Draft",
  cma: "CMA Generator",
  "campaign-generator": "Campaign Generator",
  "social-post": "Social Post",
  "meeting-prep": "Meeting Prep",
  "seo-content": "SEO Content",
  "subject-line": "Subject Line A/B",
};

export function AiUsageView() {
  const [data, setData] = useState<UsageData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/ai-usage?days=${days}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxCalls = data ? Math.max(...data.byFeature.map((f) => f.calls), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              days === p.days
                ? "bg-navy-600 text-white border-navy-600"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total Calls" value={data.totalCalls.toLocaleString()} />
            <StatCard label="Total Tokens" value={formatTokens(data.totalTokens)} />
            <StatCard label="Input Tokens" value={formatTokens(data.inputTokens)} />
            <StatCard label="Output Tokens" value={formatTokens(data.outputTokens)} />
            <StatCard label="Avg Latency" value={`${data.avgLatencyMs}ms`} />
            <StatCard label="Est. Cost" value={`$${data.estimatedCost.toFixed(2)}`} accent />
          </div>

          {/* Daily chart */}
          {data.daily.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <h2 className="font-semibold text-navy-700 mb-4">Daily API Calls</h2>
              <div className="flex items-end gap-1 h-32 sm:h-40">
                {data.daily.map((d) => {
                  const maxDailyCalls = Math.max(...data.daily.map((x) => x.calls), 1);
                  const pct = (d.calls / maxDailyCalls) * 100;
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.calls} calls`}>
                      <span className="text-[9px] text-slate-400 hidden sm:block">{d.calls}</span>
                      <div className="w-full rounded-t bg-navy-500" style={{ height: `${Math.max(pct, 2)}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-slate-400">{data.daily[0]?.day}</span>
                <span className="text-[10px] text-slate-400">{data.daily[data.daily.length - 1]?.day}</span>
              </div>
            </div>
          )}

          {/* Feature breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h2 className="font-semibold text-navy-700 mb-4">Usage by Feature</h2>
            <div className="space-y-3">
              {data.byFeature.map((f) => (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="w-32 sm:w-40 text-sm text-slate-600 truncate">
                    {FEATURE_LABELS[f.feature] ?? f.feature}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max((f.calls / maxCalls) * 100, f.calls > 0 ? 8 : 0)}%` }}
                    >
                      {f.calls > 0 && (
                        <span className="text-[10px] font-bold text-white">{f.calls}</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 shrink-0">
                    <span>{formatTokens(f.tokens)} tok</span>
                    <span>{f.avgLatency}ms</span>
                  </div>
                </div>
              ))}
              {data.byFeature.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No AI usage recorded</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${accent ? "bg-crimson-50 border-crimson-200" : "bg-white border-slate-200"}`}>
      <p className={`text-lg sm:text-xl font-bold ${accent ? "text-crimson-700" : "text-navy-700"}`}>{value}</p>
      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
