"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useHasMounted } from "@/hooks/use-has-mounted";
import type { DonutSegment } from "@/lib/calculators/types";

interface PaymentDonutProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  centerSubtext?: string;
}

export function PaymentDonut({
  segments,
  centerLabel,
  centerValue,
  centerSubtext,
}: PaymentDonutProps) {
  const hasMounted = useHasMounted();
  const filteredSegments = segments.filter((s) => s.value > 0);

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      {hasMounted ? (
        <ResponsiveContainer width="100%" aspect={1}>
          <PieChart>
            <Pie
              data={filteredSegments}
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="value"
              animationDuration={800}
              animationBegin={0}
              stroke="none"
            >
              {filteredSegments.map((segment) => (
                <Cell key={segment.name} fill={segment.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div aria-hidden="true" className="aspect-square w-full" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xs text-navy-200">{centerLabel}</span>
        <span className="font-serif text-2xl font-bold text-white">{centerValue}</span>
        {centerSubtext && (
          <span className="text-xs text-navy-300">{centerSubtext}</span>
        )}
      </div>
    </div>
  );
}
