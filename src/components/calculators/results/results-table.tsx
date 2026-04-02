import { cn } from "@/lib/utils";

interface ResultsTableRow {
  label: string;
  value: string;
  isSummary?: boolean;
}

interface ResultsTableProps {
  rows: ResultsTableRow[];
}

export function ResultsTable({ rows }: ResultsTableProps) {
  return (
    <div className="w-full">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "flex items-center justify-between py-2 px-1 text-xs",
            row.isSummary
              ? "border-t border-navy-500 font-semibold text-white mt-1 pt-3"
              : "text-navy-200",
            !row.isSummary && i % 2 === 0 && "bg-white/5 rounded"
          )}
        >
          <span>{row.label}</span>
          <span className="tabular-nums font-medium text-white">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
