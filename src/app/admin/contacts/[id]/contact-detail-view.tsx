"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: unknown;
  createdAt: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  priority: string;
}

interface TransactionItem {
  id: string;
  address: string;
  purchasePrice: number;
  closingDate: string | null;
  status: string;
  milestones: { id: string; name: string; completedAt: string | null; sortOrder: number }[];
  documents: { id: string; name: string; type: string; uploadedAt: string | null; required: boolean }[];
}

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string;
  type: string;
  stage: string;
  score: number;
  notes: string | null;
  birthday: string | null;
  closeAnniversary: string | null;
  createdAt: string;
  assignedAgent: { id: string; firstName: string; lastName: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  activities: Activity[];
  tasks: TaskItem[];
  transactions: TransactionItem[];
}

interface ContactDetailViewProps {
  contact: ContactData;
  agents: { id: string; firstName: string; lastName: string }[];
  allTags: { id: string; name: string; color: string }[];
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", contacted: "Contacted", searching: "Searching",
  showing: "Showing", offer: "Offer", under_contract: "Under Contract",
  closed: "Closed", lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-700", contacted: "bg-indigo-100 text-indigo-700",
  searching: "bg-purple-100 text-purple-700", showing: "bg-amber-100 text-amber-700",
  offer: "bg-orange-100 text-orange-700", under_contract: "bg-green-100 text-green-700",
  closed: "bg-emerald-100 text-emerald-700", lost: "bg-slate-100 text-slate-500",
};

const ACTIVITY_ICONS: Record<string, string> = {
  listing_view: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  form_submission: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  email_open: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  note: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  stage_change: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
};

export function ContactDetailView({ contact, agents, allTags }: ContactDetailViewProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateField = async (field: string, value: unknown) => {
    setIsUpdating(true);
    await fetch(`/api/admin/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setIsUpdating(false);
    router.refresh();
  };

  return (
    <div className={`space-y-6 transition-opacity ${isUpdating ? "opacity-70" : ""}`}>
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-slate-500">{contact.email}</p>
            {contact.phone && <p className="text-slate-500">{contact.phone}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-navy-700">{contact.score}</p>
              <p className="text-xs text-slate-400">Score</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STAGE_COLORS[contact.stage] ?? "bg-slate-100"}`}>
              {STAGE_LABELS[contact.stage] ?? contact.stage}
            </span>
          </div>
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div>
            <label className="text-xs font-medium text-slate-500">Stage</label>
            <select
              value={contact.stage}
              onChange={(e) => updateField("stage", e.target.value)}
              className="w-full mt-1 h-9 px-3 text-sm border border-slate-200 rounded-lg"
            >
              {Object.entries(STAGE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Type</label>
            <select
              value={contact.type}
              onChange={(e) => updateField("type", e.target.value)}
              className="w-full mt-1 h-9 px-3 text-sm border border-slate-200 rounded-lg"
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Source</label>
            <p className="mt-1 text-sm text-navy-700">{contact.source}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Assigned Agent</label>
            <select
              value={contact.assignedAgent?.id ?? ""}
              onChange={(e) => updateField("assignedAgentId", e.target.value || null)}
              className="w-full mt-1 h-9 px-3 text-sm border border-slate-200 rounded-lg"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-500">Tags</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.tags.map((ct) => (
              <span
                key={ct.tag.id}
                className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                style={{ backgroundColor: ct.tag.color }}
              >
                {ct.tag.name}
              </span>
            ))}
            {contact.tags.length === 0 && <span className="text-xs text-slate-400">No tags</span>}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Activity Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-navy-700 mb-4">Activity Timeline</h2>
          {contact.activities.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No activity recorded yet</p>
          ) : (
            <div className="space-y-4">
              {contact.activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="mt-0.5 h-8 w-8 rounded-full bg-navy-50 flex items-center justify-center shrink-0">
                    <svg className="h-4 w-4 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ACTIVITY_ICONS[activity.type] ?? ACTIVITY_ICONS.note!} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-700">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Tasks + Transactions */}
        <div className="space-y-6">
          {/* Tasks */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-navy-700 mb-4">Tasks</h2>
            {contact.tasks.length === 0 ? (
              <p className="text-sm text-slate-400">No tasks</p>
            ) : (
              <div className="space-y-2">
                {contact.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                    <div className={`h-4 w-4 rounded-full border-2 ${task.completedAt ? "bg-green-500 border-green-500" : "border-slate-300"}`} />
                    <div className="flex-1">
                      <p className={`text-sm ${task.completedAt ? "text-slate-400 line-through" : "text-navy-700"}`}>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p className="text-xs text-slate-400">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      task.priority === "high" ? "bg-red-100 text-red-700" :
                      task.priority === "low" ? "bg-slate-100 text-slate-500" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions */}
          {contact.transactions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-navy-700 mb-4">Transactions</h2>
              {contact.transactions.map((tx) => {
                const completedCount = tx.milestones.filter((m) => m.completedAt).length;
                const progress = tx.milestones.length > 0 ? (completedCount / tx.milestones.length) * 100 : 0;
                return (
                  <div key={tx.id} className="border border-slate-100 rounded-lg p-4 mb-3 last:mb-0">
                    <p className="text-sm font-semibold text-navy-700">{tx.address}</p>
                    <p className="text-xs text-slate-500">${tx.purchasePrice.toLocaleString()}</p>
                    {tx.closingDate && (
                      <p className="text-xs text-slate-400">
                        Closing: {new Date(tx.closingDate).toLocaleDateString()}
                      </p>
                    )}
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Progress</span>
                        <span className="text-xs font-semibold text-navy-700">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    {/* Milestones */}
                    <div className="mt-3 space-y-1">
                      {tx.milestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-xs">
                          <div className={`h-3 w-3 rounded-full ${m.completedAt ? "bg-green-500" : "border-2 border-slate-300"}`} />
                          <span className={m.completedAt ? "text-slate-400" : "text-navy-700"}>
                            {m.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-navy-700 mb-2">Notes</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {contact.notes ?? "No notes yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
