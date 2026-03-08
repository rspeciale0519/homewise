"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";

interface ProgressSummary {
  totalContent: number;
  totalEnrollments: number;
  avgCompletionRate: number;
  overdueCount: number;
}

interface AgentProgress {
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  tracksCompleted: number;
  tracksTotal: number;
  contentCompleted: number;
  contentTotal: number;
  avgCompletion: number;
  lastActivity: string | null;
}

interface ProgressData {
  summary: ProgressSummary;
  agents: AgentProgress[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function TrainingProgressView() {
  const { toast } = useToast();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetch<ProgressData>("/api/admin/training/progress");
      setData(result);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400">Failed to load progress data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <SummaryCard label="Total Content" value={data.summary.totalContent} />
        <SummaryCard label="Enrollments" value={data.summary.totalEnrollments} />
        <SummaryCard
          label="Avg Completion"
          value={`${Math.round(data.summary.avgCompletionRate)}%`}
        />
        <SummaryCard
          label="Overdue"
          value={data.summary.overdueCount}
          accent={data.summary.overdueCount > 0}
        />
      </div>

      {/* Agent progress table */}
      {data.agents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-400">No agent data available</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Agent</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Tracks</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Content</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Completion</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((agent) => (
                    <AgentRow
                      key={agent.userId}
                      agent={agent}
                      expanded={expandedAgent === agent.userId}
                      onToggle={() =>
                        setExpandedAgent(
                          expandedAgent === agent.userId ? null : agent.userId,
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {data.agents.map((agent) => (
              <AgentCard
                key={agent.userId}
                agent={agent}
                expanded={expandedAgent === agent.userId}
                onToggle={() =>
                  setExpandedAgent(
                    expandedAgent === agent.userId ? null : agent.userId,
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 text-center">
      <p
        className={`text-base sm:text-lg font-bold ${
          accent ? "text-crimson-700" : "text-navy-700"
        }`}
      >
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

function AgentAvatar({ agent }: { agent: AgentProgress }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-600 overflow-hidden shrink-0">
        {agent.photoUrl ? (
          <img src={agent.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          `${agent.firstName[0]}${agent.lastName[0]}`
        )}
      </div>
      <span className="font-medium text-navy-700 whitespace-nowrap text-sm">
        {agent.firstName} {agent.lastName}
      </span>
    </div>
  );
}

function CompletionBar({ pct }: { pct: number }) {
  const rounded = Math.round(pct);
  const barColor =
    rounded >= 80
      ? "bg-green-500"
      : rounded >= 50
        ? "bg-amber-500"
        : "bg-navy-500";

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${rounded}%` }}
        />
      </div>
      <span className="font-medium text-navy-700 tabular-nums text-sm">
        {rounded}%
      </span>
    </div>
  );
}

function ExpandedDetail({ agent }: { agent: AgentProgress }) {
  return (
    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Track Breakdown
      </p>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Tracks Completed</p>
          <p className="font-semibold text-navy-700">
            {agent.tracksCompleted} / {agent.tracksTotal}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Content Completed</p>
          <p className="font-semibold text-navy-700">
            {agent.contentCompleted} / {agent.contentTotal}
          </p>
        </div>
      </div>
      {agent.tracksTotal > 0 && (
        <div className="mt-3">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-navy-500 rounded-full transition-all duration-500"
              style={{
                width: `${
                  agent.tracksTotal > 0
                    ? Math.round((agent.tracksCompleted / agent.tracksTotal) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {Math.round((agent.tracksCompleted / agent.tracksTotal) * 100)}% of
            tracks complete
          </p>
        </div>
      )}
    </div>
  );
}

function AgentRow({
  agent,
  expanded,
  onToggle,
}: {
  agent: AgentProgress;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`h-3 w-3 text-slate-400 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
            <AgentAvatar agent={agent} />
          </div>
        </td>
        <td className="px-4 py-3 text-right text-slate-700">
          {agent.tracksCompleted}/{agent.tracksTotal}
        </td>
        <td className="px-4 py-3 text-right text-slate-700">
          {agent.contentCompleted}/{agent.contentTotal}
        </td>
        <td className="px-4 py-3">
          <CompletionBar pct={agent.avgCompletion} />
        </td>
        <td className="px-4 py-3 text-right text-sm text-slate-500">
          {agent.lastActivity ? timeAgo(agent.lastActivity) : "Never"}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <ExpandedDetail agent={agent} />
          </td>
        </tr>
      )}
    </>
  );
}

function AgentCard({
  agent,
  expanded,
  onToggle,
}: {
  agent: AgentProgress;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div onClick={onToggle} className="p-4 cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg
              className={`h-3 w-3 text-slate-400 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
            <AgentAvatar agent={agent} />
          </div>
          <CompletionBar pct={agent.avgCompletion} />
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500 text-xs">Tracks</span>
            <p className="font-semibold text-navy-700">
              {agent.tracksCompleted}/{agent.tracksTotal}
            </p>
          </div>
          <div>
            <span className="text-slate-500 text-xs">Content</span>
            <p className="font-semibold text-navy-700">
              {agent.contentCompleted}/{agent.contentTotal}
            </p>
          </div>
          <div>
            <span className="text-slate-500 text-xs">Last Active</span>
            <p className="font-semibold text-navy-700">
              {agent.lastActivity ? timeAgo(agent.lastActivity) : "Never"}
            </p>
          </div>
        </div>
      </div>
      {expanded && <ExpandedDetail agent={agent} />}
    </div>
  );
}
