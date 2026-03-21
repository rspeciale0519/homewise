"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StatPeriod {
  id: string;
  period: string;
  medianPrice: number;
  avgDom: number;
}

interface MarketTrendChartProps {
  stats: StatPeriod[];
}

function formatPeriod(period: string): string {
  const parts = period.split("-");
  const month = parts[1];
  if (!month) return period;
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[parseInt(month, 10) - 1] ?? period;
}

function formatPrice(value: number): string {
  return `$${(value / 1000).toFixed(0)}k`;
}

export function MarketTrendChart({ stats }: MarketTrendChartProps) {
  if (stats.length < 2) return null;

  const first = stats[0];
  const last = stats[stats.length - 1];

  const priceDelta =
    first && last && first.medianPrice > 0
      ? ((last.medianPrice - first.medianPrice) / first.medianPrice) * 100
      : 0;
  const domDelta = first && last ? last.avgDom - first.avgDom : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100">
        <h2 className="text-base font-semibold text-navy-700">6-Month Trend</h2>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-[2px] rounded bg-navy-600" />
            Median Price
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3"
              style={{ borderTop: "2px dashed #DB2526", opacity: 0.8 }}
            />
            Days on Market
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={stats} margin={{ top: 4, right: 44, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mktNavyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2E276D" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#2E276D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mktCrimsonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DB2526" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#DB2526" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />

            <XAxis
              dataKey="period"
              tickFormatter={formatPeriod}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              yAxisId="price"
              orientation="left"
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />

            <YAxis
              yAxisId="dom"
              orientation="right"
              tickFormatter={(v: number) => `${v}d`}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />

            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "medianPrice")
                  return [`$${value.toLocaleString()}`, "Median Price"];
                return [`${value} days`, "Avg Days on Market"];
              }}
              labelFormatter={formatPeriod}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
              }}
            />

            <Area
              yAxisId="price"
              type="monotone"
              dataKey="medianPrice"
              stroke="#2E276D"
              strokeWidth={2.5}
              fill="url(#mktNavyGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#2E276D", strokeWidth: 0 }}
            />

            <Area
              yAxisId="dom"
              type="monotone"
              dataKey="avgDom"
              stroke="#DB2526"
              strokeWidth={2}
              strokeDasharray="5 3"
              fill="url(#mktCrimsonGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#DB2526", strokeWidth: 0 }}
              opacity={0.85}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Delta indicators */}
      <div className="flex gap-6 px-4 sm:px-5 py-3 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Median Price</p>
          <p className="text-lg font-bold text-navy-700">
            {last ? `$${last.medianPrice.toLocaleString()}` : "—"}
          </p>
          <p
            className={`text-xs font-medium ${
              priceDelta >= 0 ? "text-green-600" : "text-crimson-600"
            }`}
          >
            {priceDelta >= 0 ? "↑" : "↓"} {Math.abs(priceDelta).toFixed(1)}%{" "}
            <span className="text-slate-400 font-normal">vs 6mo ago</span>
          </p>
        </div>

        <div className="w-px bg-slate-100" />

        <div>
          <p className="text-xs text-slate-500 mb-0.5">Avg Days on Market</p>
          <p className="text-lg font-bold" style={{ color: "#DB2526" }}>
            {last ? `${last.avgDom} days` : "—"}
          </p>
          <p
            className={`text-xs font-medium ${
              domDelta <= 0 ? "text-green-600" : "text-crimson-600"
            }`}
          >
            {domDelta >= 0 ? "↑" : "↓"} {Math.abs(domDelta)}{" "}
            <span className="text-slate-400 font-normal">days vs 6mo ago</span>
          </p>
        </div>
      </div>
    </div>
  );
}
