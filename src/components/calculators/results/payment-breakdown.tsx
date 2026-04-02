import type { DonutSegment } from "@/lib/calculators/types";

interface PaymentBreakdownProps {
  segments: DonutSegment[];
}

export function PaymentBreakdown({ segments }: PaymentBreakdownProps) {
  const filteredSegments = segments.filter((s) => s.value > 0);

  return (
    <div className="space-y-2">
      {filteredSegments.map((segment) => (
        <div key={segment.name} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-navy-200">{segment.name}</span>
          </span>
          <span className="font-medium text-white tabular-nums">
            ${segment.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}
