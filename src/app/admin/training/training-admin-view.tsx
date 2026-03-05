"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TrainingItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  audience: string;
  type: string;
  url: string | null;
  duration: number | null;
  tags: string[];
  published: boolean;
}

interface TrackData {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  autoEnroll: boolean;
  items: { content: { id: string; title: string } }[];
  _count: { enrollments: number };
}

interface TrainingAdminViewProps {
  content: TrainingItem[];
  tracks: TrackData[];
  categories: string[];
}

export function TrainingAdminView({ content, tracks, categories }: TrainingAdminViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"content" | "tracks">("content");
  const [showForm, setShowForm] = useState(false);

  const handleCreateContent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        category: form.get("category"),
        audience: form.get("audience"),
        type: form.get("type"),
        url: form.get("url") || undefined,
      }),
    });
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("content")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "content" ? "bg-navy-600 text-white" : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          Content ({content.length})
        </button>
        <button
          onClick={() => setActiveTab("tracks")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "tracks" ? "bg-navy-600 text-white" : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          Tracks ({tracks.length})
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="ml-auto px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
        >
          + Add Content
        </button>
      </div>

      {/* Add content form */}
      {showForm && (
        <form onSubmit={handleCreateContent} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-navy-700">New Training Content</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="title" required placeholder="Title" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
            <select name="category" required className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea name="description" placeholder="Description" rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-navy-600" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select name="audience" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
              <option value="agent">Agent Only</option>
              <option value="public">Public</option>
              <option value="both">Both</option>
            </select>
            <select name="type" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="article">Article</option>
              <option value="quiz">Quiz</option>
            </select>
            <input name="url" placeholder="URL (optional)" className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
          </div>
        </form>
      )}

      {/* Content list */}
      {activeTab === "content" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Audience</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {content.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-navy-700">{item.title}</td>
                  <td className="py-3 px-4 text-slate-600 capitalize">{item.category.replace("_", " ")}</td>
                  <td className="py-3 px-4 text-slate-600 capitalize">{item.type}</td>
                  <td className="py-3 px-4 text-slate-600 capitalize">{item.audience}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.published ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Tracks list */}
      {activeTab === "tracks" && (
        <div className="space-y-4">
          {tracks.map((track) => (
            <div key={track.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-navy-700">{track.name}</h3>
                  {track.description && <p className="text-xs text-slate-500 mt-0.5">{track.description}</p>}
                </div>
                <div className="flex gap-2">
                  {track.required && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-crimson-100 text-crimson-700">Required</span>
                  )}
                  {track.autoEnroll && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Auto-enroll</span>
                  )}
                  <span className="text-xs text-slate-400">{track._count.enrollments} enrolled</span>
                </div>
              </div>
              <div className="space-y-1">
                {track.items.map((item, i) => (
                  <div key={item.content.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">{i + 1}</span>
                    {item.content.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {tracks.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No tracks created yet</p>
          )}
        </div>
      )}
    </div>
  );
}
