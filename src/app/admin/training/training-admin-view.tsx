"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";
import { TrainingContentDrawer } from "@/components/admin/training-content-drawer";
import { TrainingCourseDrawer } from "@/components/admin/training-course-drawer";
import { TrainingProgressView } from "@/components/admin/training-progress-view";
import type { TrainingItem, CourseData } from "./types";

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
      const data = await adminFetch<CourseData[]>("/api/admin/training/courses");
      setCoursesData(data);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }, [toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching effect
  useEffect(() => { fetchContent(); }, [fetchContent]);

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
          <button
            onClick={() => openDrawer(null)}
            className="ml-auto px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
          >
            + Add Content
          </button>
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
              <option value="agent">Agent Only</option>
              <option value="public">Public</option>
              <option value="both">Both</option>
            </select>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && (
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
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => openDrawer(item)}
                        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="py-3 px-4 font-medium text-navy-700 max-w-[200px] truncate">{item.title}</td>
                        <td className="py-3 px-4 text-slate-600 capitalize">{item.category.replace("_", " ")}</td>
                        <td className="py-3 px-4 text-slate-600 capitalize">{item.type}</td>
                        <td className="py-3 px-4 text-slate-600 capitalize">{item.audience}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePublished(item);
                            }}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                              item.published
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {item.published ? "Published" : "Draft"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-sm text-slate-400">
                          {content.length === 0 ? "No content yet" : "No results match your filters"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
    </div>
  );
}
