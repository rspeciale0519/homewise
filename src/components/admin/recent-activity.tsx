"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "contact" | "evaluation" | "buyer";
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  contact: { label: "Contact", color: "bg-navy-50 text-navy-700" },
  evaluation: { label: "Evaluation", color: "bg-amber-50 text-amber-700" },
  buyer: { label: "Buyer", color: "bg-crimson-50 text-crimson-700" },
};

const statusColors: Record<string, string> = {
  new: "bg-emerald-50 text-emerald-700",
  read: "bg-slate-100 text-slate-600",
  archived: "bg-slate-50 text-slate-400",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-slate-400">
        No recent submissions yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => {
        const typeInfo = typeLabels[item.type] ?? { label: item.type, color: "bg-slate-100 text-slate-600" };
        const statusColor = statusColors[item.status] ?? statusColors.new;
        const href = `/admin/submissions/${item.type}/${item.id}`;

        return (
          <Link
            key={`${item.type}-${item.id}`}
            href={href}
            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors"
          >
            <span className={cn("shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", typeInfo.color)}>
              {typeInfo.label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy-700 truncate">{item.name}</p>
              <p className="text-xs text-slate-400 truncate">{item.email}</p>
            </div>
            <span className={cn("shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full", statusColor)}>
              {item.status}
            </span>
            <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">
              {relativeTime(item.createdAt)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
