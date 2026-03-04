"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BroadcastItem {
  id: string;
  name: string;
  subject: string;
  body: string;
  audienceTag: string | null;
  status: string;
  sentAt: string | null;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

interface TagInfo {
  id: string;
  name: string;
  count: number;
}

interface BroadcastListViewProps {
  broadcasts: BroadcastItem[];
  tags: TagInfo[];
}

export function BroadcastListView({ broadcasts, tags }: BroadcastListViewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audienceTag, setAudienceTag] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (send: boolean) => {
    if (!name.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    await fetch("/api/admin/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, body, audienceTag: audienceTag || undefined, send }),
    });
    setSending(false);
    setIsCreating(false);
    setName("");
    setSubject("");
    setBody("");
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 text-sm font-semibold text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition-colors"
        >
          {isCreating ? "Cancel" : "New Broadcast"}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Broadcast name" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          <select value={audienceTag} onChange={(e) => setAudienceTag(e.target.value)} className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
            <option value="">All contacts</option>
            {tags.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.count})</option>)}
          </select>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Email body (HTML or plain text)" rows={6} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-navy-600" />
          <div className="flex gap-2">
            <button onClick={() => handleSend(false)} disabled={sending} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50">
              Save Draft
            </button>
            <button onClick={() => handleSend(true)} disabled={sending} className="px-4 py-2 text-sm font-semibold text-white bg-crimson-600 rounded-lg hover:bg-crimson-700 disabled:opacity-50">
              {sending ? "Sending..." : "Send Now"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {broadcasts.map((broadcast) => {
          const openRate = broadcast.sentCount > 0 ? ((broadcast.openCount / broadcast.sentCount) * 100).toFixed(1) : "—";
          return (
            <div key={broadcast.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-navy-700">{broadcast.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{broadcast.subject}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${broadcast.status === "sent" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {broadcast.status}
                  </span>
                  {broadcast.sentAt && (
                    <p className="text-xs text-slate-400 mt-1">{new Date(broadcast.sentAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              {broadcast.status === "sent" && (
                <div className="flex gap-6 mt-3 pt-3 border-t border-slate-100">
                  <div className="text-xs"><span className="text-slate-500">Sent</span> <span className="font-semibold text-navy-700">{broadcast.sentCount}</span></div>
                  <div className="text-xs"><span className="text-slate-500">Opens</span> <span className="font-semibold text-green-600">{broadcast.openCount}</span></div>
                  <div className="text-xs"><span className="text-slate-500">Open Rate</span> <span className="font-semibold">{openRate}%</span></div>
                  <div className="text-xs"><span className="text-slate-500">Clicks</span> <span className="font-semibold text-blue-600">{broadcast.clickCount}</span></div>
                </div>
              )}
            </div>
          );
        })}

        {broadcasts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">No broadcasts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
