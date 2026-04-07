"use client";

import { useState } from "react";
import { useHasMounted } from "@/hooks/use-has-mounted";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AgentMetrics {
  agentId: string;
  firstName: string;
  lastName: string;
  leads: number;
  closings: number;
  pipelineValue: number;
}

type Metric = "leads" | "closings" | "pipelineValue";

const METRICS: { key: Metric; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "closings", label: "Closings" },
  { key: "pipelineValue", label: "Pipeline Value" },
];

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === "pipelineValue") return `$${(value / 1000).toFixed(0)}k`;
  return String(value);
}

interface TeamPerformanceChartProps {
  agents: AgentMetrics[];
}

export function TeamPerformanceChart({ agents }: TeamPerformanceChartProps) {
  const hasMounted = useHasMounted();
  const [activeMetric, setActiveMetric] = useState<Metric>("closings");
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  if (agents.length === 0) return null;

  const data = agents
    .slice()
    .sort((a, b) => b[activeMetric] - a[activeMetric])
    .map((agent) => ({
      name: `${agent.firstName} ${agent.lastName[0]}.`,
      agentId: agent.agentId,
      value: agent[activeMetric],
    }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="font-semibold text-navy-700">Agent Comparison</h2>
        <div className="flex items-center gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeMetric === m.key
                  ? "bg-navy-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {hasMounted ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMetricValue(v, activeMetric)}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value) => [
                formatMetricValue(Number(value), activeMetric),
                METRICS.find((m) => m.key === activeMetric)?.label ?? activeMetric,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
              }}
              cursor={{ fill: "rgba(46,39,109,0.04)" }}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              onMouseEnter={(entry) =>
                setHoveredBar((entry as unknown as { agentId: string }).agentId)
              }
              onMouseLeave={() => setHoveredBar(null)}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.agentId}
                  fill={hoveredBar === entry.agentId ? "#DB2526" : "#2E276D"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div aria-hidden="true" className="h-[220px] w-full" />
      )}
    </div>
  );
}
