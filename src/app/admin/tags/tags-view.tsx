"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/admin/admin-toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { adminFetch } from "@/lib/admin-fetch";

interface TagItem {
  id: string;
  name: string;
  color: string;
  contactCount: number;
  createdAt: string;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#6b7280",
];

export function TagsView() {
  const { toast } = useToast();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TagItem | null>(null);

  const refreshTags = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<TagItem[]>("/api/admin/tags");
      setTags(data);
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
        const data = await adminFetch<TagItem[]>("/api/admin/tags");
        if (!cancelled) setTags(data);
      } catch (err) {
        if (!cancelled) toast((err as Error).message, "error");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await adminFetch("/api/admin/tags", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      toast("Tag created", "success");
      setNewName("");
      refreshTags();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await adminFetch("/api/admin/tags", {
        method: "PATCH",
        body: JSON.stringify({ id, name: editName, color: editColor }),
      });
      toast("Tag updated", "success");
      setEditingId(null);
      refreshTags();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminFetch("/api/admin/tags", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      toast("Tag deleted", "success");
      setDeleteTarget(null);
      refreshTags();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Tag"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h3 className="font-semibold text-navy-700 mb-3">Create Tag</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tag name"
            className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${newColor === c ? "border-navy-600 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button type="submit" className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 shrink-0">
            Add Tag
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Tag list */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white rounded-xl border border-slate-200 p-4">
              {editingId === tag.id ? (
                <div className="space-y-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`h-6 w-6 rounded-full border-2 ${editColor === c ? "border-navy-600" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(tag.id)} className="px-3 py-1.5 bg-navy-600 text-white rounded-lg text-xs font-semibold">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <div className="min-w-0">
                      <p className="font-medium text-navy-700 truncate">{tag.name}</p>
                      <p className="text-xs text-slate-400">{tag.contactCount} contact{tag.contactCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEdit(tag)} className="text-xs text-navy-600 hover:underline">Edit</button>
                    {tag.contactCount === 0 && (
                      <button onClick={() => setDeleteTarget(tag)} className="text-xs text-red-500 hover:underline">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {tags.length === 0 && (
            <div className="col-span-full text-center py-8 text-sm text-slate-400">No tags created yet</div>
          )}
        </div>
      )}
    </div>
  );
}
