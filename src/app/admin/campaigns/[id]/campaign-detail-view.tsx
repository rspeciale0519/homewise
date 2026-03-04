"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Variant {
  id: string;
  variant: string;
  subject: string;
  sendCount: number;
  openCount: number;
  clickCount: number;
}

interface CampaignEmailItem {
  id: string;
  subject: string;
  body: string;
  delayDays: number;
  delayHours: number;
  sortOrder: number;
  channel: string;
  smsBody: string | null;
  variants: Variant[];
}

interface EnrollmentItem {
  id: string;
  currentStep: number;
  status: string;
  nextSendAt: string | null;
  completedAt: string | null;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string; email: string };
}

interface CampaignData {
  id: string;
  name: string;
  type: string;
  status: string;
  triggerSource: string | null;
  triggerType: string | null;
  triggerStage: string | null;
  emails: CampaignEmailItem[];
  enrollments: EnrollmentItem[];
  _count: { enrollments: number };
}

interface CampaignDetailViewProps {
  campaign: CampaignData;
}

export function CampaignDetailView({ campaign }: CampaignDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"emails" | "enrollments" | "analytics">("emails");
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newDelay, setNewDelay] = useState(1);
  const [newChannel, setNewChannel] = useState("email");

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/admin/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };

  const handleAddEmail = async () => {
    if (!newSubject.trim() || !newBody.trim()) return;
    await fetch(`/api/admin/campaigns/${campaign.id}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: newSubject, body: newBody, delayDays: newDelay, channel: newChannel }),
    });
    setNewSubject("");
    setNewBody("");
    setIsAddingEmail(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-700">{campaign.name}</h1>
          <p className="text-sm text-slate-500">
            {campaign.type} campaign · {campaign._count.enrollments} enrolled
          </p>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button onClick={() => handleStatusChange("active")} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              Activate
            </button>
          )}
          {campaign.status === "active" && (
            <button onClick={() => handleStatusChange("paused")} className="px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors">
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button onClick={() => handleStatusChange("active")} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              Resume
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {(["emails", "enrollments", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? "text-navy-700 border-b-2 border-navy-700" : "text-slate-500 hover:text-navy-700"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "emails" && (
        <div className="space-y-3">
          {campaign.emails.map((email, i) => (
            <div key={email.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <span className="h-8 w-8 rounded-full bg-navy-50 text-navy-600 flex items-center justify-center text-sm font-semibold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-navy-700 text-sm">{email.subject}</h3>
                    <span className="text-xs text-slate-400">{email.channel}</span>
                    {email.delayDays > 0 && <span className="text-xs text-slate-400">+{email.delayDays}d</span>}
                  </div>
                  {email.variants.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-slate-500">A/B Subject Variants:</p>
                      {email.variants.map((v) => {
                        const openRate = v.sendCount > 0 ? ((v.openCount / v.sendCount) * 100).toFixed(1) : "—";
                        return (
                          <div key={v.id} className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-navy-600">{v.variant}</span>
                            <span className="text-slate-600 flex-1 truncate">{v.subject}</span>
                            <span className="text-slate-400">{v.sendCount} sent</span>
                            <span className="text-green-600">{openRate}% open</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isAddingEmail ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject line" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
              <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Email body (HTML)" rows={4} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-navy-600" />
              <div className="flex gap-3">
                <input type="number" value={newDelay} onChange={(e) => setNewDelay(Number(e.target.value))} min={0} className="w-24 h-10 px-3 text-sm border border-slate-200 rounded-lg" placeholder="Delay days" />
                <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)} className="h-10 px-3 text-sm border border-slate-200 rounded-lg">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
                <button onClick={handleAddEmail} className="px-4 h-10 text-sm font-semibold text-white bg-navy-600 rounded-lg hover:bg-navy-700">Add</button>
                <button onClick={() => setIsAddingEmail(false)} className="px-4 h-10 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsAddingEmail(true)} className="w-full py-3 text-sm font-medium text-navy-600 border border-dashed border-slate-300 rounded-xl hover:bg-navy-50 transition-colors">
              + Add Email Step
            </button>
          )}
        </div>
      )}

      {activeTab === "enrollments" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Contact</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Step</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Next Send</th>
              </tr>
            </thead>
            <tbody>
              {campaign.enrollments.map((en) => (
                <tr key={en.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">{en.contact.firstName} {en.contact.lastName}</td>
                  <td className="px-4 py-2">{en.currentStep + 1} / {campaign.emails.length}</td>
                  <td className="px-4 py-2 capitalize">{en.status}</td>
                  <td className="px-4 py-2 text-slate-500">{en.nextSendAt ? new Date(en.nextSendAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {campaign.enrollments.length === 0 && (
            <p className="text-center py-8 text-slate-500">No enrollments yet.</p>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-4">
          {campaign.emails.map((email, i) => (
            <div key={email.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-sm text-navy-700 mb-3">Step {i + 1}: {email.subject}</h3>
              {email.variants.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {email.variants.map((v) => {
                    const openRate = v.sendCount > 0 ? ((v.openCount / v.sendCount) * 100).toFixed(1) : "0";
                    const clickRate = v.sendCount > 0 ? ((v.clickCount / v.sendCount) * 100).toFixed(1) : "0";
                    return (
                      <div key={v.id} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-mono font-semibold text-navy-600 mb-1">Variant {v.variant}</p>
                        <p className="text-xs text-slate-600 truncate mb-2">{v.subject}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Sent</span>
                            <span className="font-medium">{v.sendCount}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Open Rate</span>
                            <span className="font-medium text-green-600">{openRate}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Click Rate</span>
                            <span className="font-medium text-blue-600">{clickRate}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No variants generated yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
