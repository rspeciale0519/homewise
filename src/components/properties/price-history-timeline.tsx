"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { formatPrice } from "@/lib/format";

export type PricePoint = {
  observedAt: string;
  price: number;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function PriceHistoryTimeline({ points }: { points: PricePoint[] }) {
  const hasMounted = useHasMounted();
  if (points.length < 2) return null;

  const data = points.map((point) => ({
    label: dateFormatter.format(new Date(point.observedAt)),
    price: point.price,
  }));
  const first = points[0]!.price;
  const last = points[points.length - 1]!.price;
  const delta = last - first;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="font-serif text-2xl font-semibold text-navy-700">Price History</h2>
        <span
          className={`text-sm font-semibold ${delta < 0 ? "text-emerald-600" : delta > 0 ? "text-crimson-600" : "text-slate-500"}`}
        >
          {delta === 0
            ? "No change since listing"
            : `${delta < 0 ? "Down" : "Up"} ${formatPrice(Math.abs(delta))} since listing`}
        </span>
      </div>
      {hasMounted && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
              <YAxis
                tickFormatter={(value: number) => formatPrice(value)}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                width={84}
                domain={["auto", "auto"]}
              />
              <Tooltip formatter={(value) => formatPrice(Number(value))} />
              <Line
                type="stepAfter"
                dataKey="price"
                stroke="#1e3a5f"
                strokeWidth={2}
                dot={{ r: 4, fill: "#dc2626", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3">
        List price changes observed by this site. May not reflect every change made in the MLS.
      </p>
    </div>
  );
}
