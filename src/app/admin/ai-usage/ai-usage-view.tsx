"use client";

import { useEffect, useState } from "react";

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

interface ModelConfig {
  id: string;
  featureKey: string;
  label: string;
  model: string;
  tier: string;
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

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4.6", pricing: "$3.00 / $15.00", tier: "1" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", pricing: "$0.25 / $1.25", tier: "2" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", pricing: "$0.25 / $2.00", tier: "2" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", pricing: "$0.05 / $0.40", tier: "3" },
];

function modelTierFromValue(model: string): string {
  return MODEL_OPTIONS.find((m) => m.value === model)?.tier ?? "1";
}

export function AiUsageView() {
  const [activeTab, setActiveTab] = useState<"usage" | "model-config">("usage");
  const [data, setData] = useState<UsageData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [pendingModels, setPendingModels] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/admin/ai-usage?days=${days}`);
      if (!cancelled && res.ok) setData(await res.json());
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [days]);

  useEffect(() => {
    if (activeTab !== "model-config" || configs.length > 0) return;
    let cancelled = false;
    async function loadConfigs() {
      setConfigLoading(true);
      const res = await fetch("/api/admin/ai-usage/model-config");
      if (!cancelled && res.ok) {
        const rows: ModelConfig[] = await res.json();
        setConfigs(rows);
        const initial: Record<string, string> = {};
        rows.forEach((r) => { initial[r.featureKey] = r.model; });
        setPendingModels(initial);
      }
      if (!cancelled) setConfigLoading(false);
    }
    loadConfigs();
    return () => { cancelled = true; };
  }, [activeTab, configs.length]);

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    const payload = configs.map((c) => ({
      featureKey: c.featureKey,
      model: pendingModels[c.featureKey] ?? c.model,
      tier: modelTierFromValue(pendingModels[c.featureKey] ?? c.model),
    }));
    const res = await fetch("/api/admin/ai-usage/model-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaveResult(res.ok ? "ok" : "error");
    if (res.ok) setConfigs((prev) => prev.map((c) => ({ ...c, model: pendingModels[c.featureKey] ?? c.model })));
    setSaving(false);
  }

  const maxCalls = data ? Math.max(...data.byFeature.map((f) => f.calls), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["usage", "model-config"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? "border-navy-600 text-navy-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "usage" ? "Usage" : "Model Config"}
          </button>
        ))}
      </div>

      {/* Usage Tab */}
      {activeTab === "usage" && (
        <>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Total Calls" value={data.totalCalls.toLocaleString()} />
                <StatCard label="Total Tokens" value={formatTokens(data.totalTokens)} />
                <StatCard label="Input Tokens" value={formatTokens(data.inputTokens)} />
                <StatCard label="Output Tokens" value={formatTokens(data.outputTokens)} />
                <StatCard label="Avg Latency" value={`${data.avgLatencyMs}ms`} />
                <StatCard label="Est. Cost" value={`$${data.estimatedCost.toFixed(2)}`} accent />
              </div>

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
        </>
      )}

      {/* Model Config Tab */}
      {activeTab === "model-config" && (
        <>
          {configLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!configLoading && configs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-navy-700">AI Model Assignments</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Pricing shown as input / output per 1M tokens</p>
                </div>
                <div className="flex items-center gap-3">
                  {saveResult === "ok" && <span className="text-xs text-green-600 font-medium">Saved</span>}
                  {saveResult === "error" && <span className="text-xs text-red-600 font-medium">Save failed</span>}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left font-semibold">Feature</th>
                    <th className="px-3 py-3 text-left font-semibold">Tier</th>
                    <th className="px-3 py-3 text-left font-semibold">Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {configs.map((c) => (
                    <tr key={c.featureKey} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 sm:px-6 py-3 font-medium text-slate-700">{c.label}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          modelTierFromValue(pendingModels[c.featureKey] ?? c.model) === "1"
                            ? "bg-navy-100 text-navy-700"
                            : modelTierFromValue(pendingModels[c.featureKey] ?? c.model) === "2"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-green-100 text-green-700"
                        }`}>
                          Tier {modelTierFromValue(pendingModels[c.featureKey] ?? c.model)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={pendingModels[c.featureKey] ?? c.model}
                          onChange={(e) => {
                            setSaveResult(null);
                            setPendingModels((prev) => ({ ...prev, [c.featureKey]: e.target.value }));
                          }}
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-500"
                        >
                          {MODEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label} — {opt.pricing}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!configLoading && configs.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No model configurations found. Run the seed script to initialize.</p>
          )}
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
