"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";
import { TiptapEditor } from "@/components/admin/tiptap-editor";

interface SeoItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  body: string;
  metaTitle: string | null;
  metaDesc: string | null;
  city: string | null;
  neighborhood: string | null;
  status: string;
  publishedAt: string | null;
  refreshedAt: string | null;
  updatedAt: string;
}

export function SeoContentView() {
  const { toast } = useToast();
  const [items, setItems] = useState<SeoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<SeoItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<"visual" | "source">("visual");

  const refreshData = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/seo-content" : `/api/admin/seo-content?status=${filter}`;
      const data = await adminFetch<SeoItem[]>(url);
      setItems(data);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const url = filter === "all" ? "/api/admin/seo-content" : `/api/admin/seo-content?status=${filter}`;
        const data = await adminFetch<SeoItem[]>(url);
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) toast((err as Error).message, "error");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [filter, toast]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await adminFetch("/api/admin/seo-content", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      toast(status === "published" ? "Content published" : "Content unpublished", "success");
      refreshData();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminFetch("/api/admin/seo-content", {
        method: "PATCH",
        body: JSON.stringify({
          id: editing.id,
          title: editing.title,
          body: editing.body,
          metaTitle: editing.metaTitle,
          metaDesc: editing.metaDesc,
        }),
      });
      toast("Content saved", "success");
      setEditing(null);
      refreshData();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {["all", "draft", "published"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-colors ${
              filter === f ? "bg-navy-600 text-white border-navy-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-navy-700 text-lg">Edit Content</h3>
            <div>
              <label className="text-xs font-medium text-slate-500">Title</label>
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full mt-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Meta Title</label>
              <input
                value={editing.metaTitle ?? ""}
                onChange={(e) => setEditing({ ...editing, metaTitle: e.target.value })}
                className="w-full mt-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Meta Description</label>
              <textarea
                value={editing.metaDesc ?? ""}
                onChange={(e) => setEditing({ ...editing, metaDesc: e.target.value })}
                rows={2}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-500">Body</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditMode("visual")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded ${editMode === "visual" ? "bg-navy-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode("source")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded ${editMode === "source" ? "bg-navy-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    HTML
                  </button>
                </div>
              </div>
              {editMode === "visual" ? (
                <TiptapEditor
                  key={editing.id + "-visual"}
                  content={editing.body}
                  onChange={(html) => setEditing({ ...editing, body: html })}
                />
              ) : (
                <textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={12}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono resize-y focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Content list */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">City</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Updated</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-navy-700 max-w-[200px] truncate">{item.title}</td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{item.type}</td>
                    <td className="py-3 px-4 text-slate-600">{item.city ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditing(item)} className="text-xs text-navy-600 hover:underline">Edit</button>
                        {item.status === "draft" ? (
                          <button onClick={() => handleStatusChange(item.id, "published")} className="text-xs text-green-600 hover:underline">Publish</button>
                        ) : (
                          <button onClick={() => handleStatusChange(item.id, "draft")} className="text-xs text-amber-600 hover:underline">Unpublish</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-sm text-slate-400">No content found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
