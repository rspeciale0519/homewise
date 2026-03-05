"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CampaignEmail {
  id: string;
  subject: string;
  sortOrder: number;
  channel: string;
  delayDays: number;
}

interface CampaignItem {
  id: string;
  name: string;
  type: string;
  status: string;
  triggerSource: string | null;
  triggerType: string | null;
  triggerStage: string | null;
  createdAt: string;
  emails: CampaignEmail[];
  _count: { enrollments: number };
}

interface CampaignListViewProps {
  campaigns: CampaignItem[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

export function CampaignListView({ campaigns }: CampaignListViewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("drip");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    setName("");
    setIsCreating(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 text-sm font-semibold text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
        >
          {isCreating ? "Cancel" : "New Campaign"}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="drip">Drip</option>
              <option value="onboarding">Onboarding</option>
              <option value="re-engagement">Re-engagement</option>
            </select>
            <button
              onClick={handleCreate}
              className="h-10 px-4 text-sm font-semibold text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") router.push(`/admin/campaigns/${campaign.id}`); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-navy-700">{campaign.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[campaign.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {campaign.status}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{campaign.type}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {campaign.emails.length} emails · {campaign._count.enrollments} enrolled
                  {campaign.triggerSource && ` · trigger: ${campaign.triggerSource}`}
                </p>
              </div>
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">No campaigns yet. Create your first campaign to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
