"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Folder } from "lucide-react";
import { useToast } from "@/components/admin/admin-toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { adminFetch } from "@/lib/admin-fetch";
import { TrainingContentDrawer } from "@/components/admin/training-content-drawer";
import { TrainingCourseDrawer } from "@/components/admin/training-course-drawer";
import { TrainingProgressView } from "@/components/admin/training-progress-view";
import type { TrainingItem, CourseData } from "./types";
import { useTrainingSelection } from "./use-training-selection";
import { TrainingBulkBar } from "./training-bulk-bar";
import { TrainingCategoriesModal } from "./training-categories-modal";
import { TrainingContentTable } from "./training-content-table";

interface CategoryOption {
  id: string;
  name: string;
}

interface TrainingAdminViewProps {
  tracks: CourseData[];
  categories: string[];
}

export function TrainingAdminView({ tracks, categories }: TrainingAdminViewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"content" | "tracks" | "progress">("content");
  const [content, setContent] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingItem | null>(null);
  const [coursesData, setCoursesData] = useState<CourseData[]>(tracks);
  const [courseDrawerOpen, setCourseDrawerOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseData | null>(null);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<TrainingItem[]>("/api/admin/training?admin=true");
      setContent(data);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await adminFetch<CourseData[]>("/api/admin/training/tracks");
      setCoursesData(data);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }, [toast]);

  const fetchCategoryOptions = useCallback(async () => {
    try {
      const data = await adminFetch<CategoryOption[]>(
        "/api/admin/training/categories",
      );
      setCategoryOptions(data);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }, [toast]);

  useEffect(() => { fetchContent(); }, [fetchContent]);
  useEffect(() => { fetchCategoryOptions(); }, [fetchCategoryOptions]);

  const filtered = useMemo(() => {
    let list = content;
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }
    if (audienceFilter !== "all") {
      list = list.filter((i) => i.audience === audienceFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [content, categoryFilter, audienceFilter, search]);

  const filteredIds = useMemo(() => filtered.map((i) => i.id), [filtered]);
  const selection = useTrainingSelection(filteredIds);

  const runBulkStatus = useCallback(
    async (status: "draft" | "published" | "archived") => {
      const ids = filteredIds.filter((id) => selection.selectedIds.has(id));
      if (ids.length === 0) return;
      setBulkBusy(true);
      try {
        await adminFetch("/api/admin/training/bulk-status", {
          method: "POST",
          body: JSON.stringify({ contentIds: ids, status }),
        });
        toast(`Updated ${ids.length} to ${status}`, "success");
        selection.clear();
        await fetchContent();
      } catch (err) {
        toast((err as Error).message, "error");
      } finally {
        setBulkBusy(false);
      }
    },
    [filteredIds, selection, toast, fetchContent],
  );

  const runBulkCategory = useCallback(
    async (toCategoryId: string | null) => {
      const ids = filteredIds.filter((id) => selection.selectedIds.has(id));
      if (ids.length === 0) return;
      setBulkBusy(true);
      try {
        await adminFetch("/api/admin/training/bulk-category", {
          method: "POST",
          body: JSON.stringify({ contentIds: ids, toCategoryId }),
        });
        toast(`Re-categorized ${ids.length}`, "success");
        selection.clear();
        await fetchContent();
      } catch (err) {
        toast((err as Error).message, "error");
      } finally {
        setBulkBusy(false);
      }
    },
    [filteredIds, selection, toast, fetchContent],
  );

  const runBulkDelete = useCallback(async () => {
    const ids = filteredIds.filter((id) => selection.selectedIds.has(id));
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      await adminFetch("/api/admin/training/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ contentIds: ids }),
      });
      toast(`Deleted ${ids.length}`, "success");
      selection.clear();
      setConfirmBulkDelete(false);
      await fetchContent();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBulkBusy(false);
    }
  }, [filteredIds, selection, toast, fetchContent]);

  const handleTogglePublished = async (item: TrainingItem) => {
    try {
      await adminFetch(`/api/admin/training/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !item.published }),
      });
      toast(item.published ? "Content unpublished" : "Content published", "success");
      fetchContent();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const openDrawer = (item: TrainingItem | null) => {
    setEditing(item);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
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
          Courses ({coursesData.length})
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "progress" ? "bg-navy-600 text-white" : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          Progress
        </button>
        {activeTab === "content" && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCategoriesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-navy-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Folder className="h-4 w-4" />
              Categories
            </button>
            <button
              onClick={() => openDrawer(null)}
              className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
            >
              + Add Content
            </button>
          </div>
        )}
        {activeTab === "tracks" && (
          <button
            onClick={() => { setEditingCourse(null); setCourseDrawerOpen(true); }}
            className="ml-auto px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
          >
            + Create Course
          </button>
        )}
      </div>

      {/* Content tab */}
      {activeTab === "content" && (
        <>
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c.replace("_", " ")}</option>
              ))}
            </select>
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="all">All Audiences</option>
              <option value="agent_only">Agent Only</option>
              <option value="public_only">Public</option>
              <option value="both">Both</option>
            </select>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <TrainingBulkBar
            selectedCount={selection.selectedCount}
            categories={categoryOptions}
            onClear={selection.clear}
            onChangeStatus={runBulkStatus}
            onChangeCategory={runBulkCategory}
            onDelete={() => setConfirmBulkDelete(true)}
            busy={bulkBusy}
          />

          {!loading && (
            <TrainingContentTable
              items={filtered}
              selection={selection}
              totalCount={content.length}
              onRowClick={openDrawer}
              onTogglePublished={handleTogglePublished}
            />
          )}
        </>
      )}

      {/* Courses tab */}
      {activeTab === "tracks" && (
        <div className="space-y-4">
          {coursesData.map((t) => (
            <div
              key={t.id}
              onClick={() => { setEditingCourse(t); setCourseDrawerOpen(true); }}
              className="bg-white rounded-xl border border-slate-200 p-6 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-navy-700">{t.name}</h3>
                  {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                </div>
                <div className="flex gap-2">
                  {t.required && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-crimson-100 text-crimson-700">Required</span>
                  )}
                  {t.autoEnroll && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Auto-enroll</span>
                  )}
                  <span className="text-xs text-slate-400">{t._count.enrollments} enrolled</span>
                </div>
              </div>
              <div className="space-y-1">
                {t.items.map((ti, i) => (
                  <div key={ti.content.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">{i + 1}</span>
                    {ti.content.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {coursesData.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No courses created yet</p>
          )}
        </div>
      )}

      {/* Progress tab */}
      {activeTab === "progress" && <TrainingProgressView />}

      {/* Training content drawer */}
      <TrainingContentDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        item={editing}
        categories={categories}
        onSaved={fetchContent}
      />

      {/* Training course drawer */}
      <TrainingCourseDrawer
        open={courseDrawerOpen}
        onClose={() => { setCourseDrawerOpen(false); setEditingCourse(null); }}
        course={editingCourse}
        allContent={content}
        onSaved={fetchCourses}
      />

      <TrainingCategoriesModal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        onChanged={() => {
          void fetchCategoryOptions();
          void fetchContent();
        }}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selection.selectedCount} training items?`}
        message="This will permanently remove the selected content. Course items that reference any of these will be removed too. This cannot be undone."
        confirmLabel="Delete permanently"
        typeToConfirm="DELETE"
        busy={bulkBusy}
        onConfirm={runBulkDelete}
        onCancel={() => {
          if (!bulkBusy) setConfirmBulkDelete(false);
        }}
      />
    </div>
  );
}
