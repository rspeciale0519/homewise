"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";
import { DocumentDrawer } from "@/components/admin/document-drawer";
import { DocumentCategoryDrawer } from "@/components/admin/document-category-drawer";
import { DocumentRowMenu } from "@/components/admin/document-row-menu";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type {
  DocumentCategoryItem,
  DocumentItem,
  DocumentSection,
} from "./types";

type Tab = "office" | "listing" | "sales" | "quick" | "categories";

const TAB_LABELS: Array<{ key: Tab; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
  { key: "quick", label: "Quick Access" },
  { key: "categories", label: "Categories" },
];

export function DocumentsAdminView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("office");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<DocumentCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [docDrawerOpen, setDocDrawerOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<DocumentCategoryItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, cats] = await Promise.all([
        adminFetch<DocumentItem[]>("/api/admin/documents"),
        adminFetch<DocumentCategoryItem[]>("/api/admin/documents/categories"),
      ]);
      setDocuments(docs);
      setCategories(cats);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sectionCategories = useMemo(() => {
    if (activeTab === "categories" || activeTab === "quick") return categories;
    return categories.filter((c) => c.section === activeTab);
  }, [categories, activeTab]);

  const filtered = useMemo(() => {
    let list = documents;

    if (activeTab === "quick") {
      list = list.filter((d) => d.quickAccess);
    } else if (activeTab !== "categories") {
      list = list.filter((d) =>
        d.categories.some((c) => c.section === (activeTab as DocumentSection)),
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((d) =>
        d.categories.some((c) => c.id === categoryFilter),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.slug.toLowerCase().includes(q),
      );
    }

    return list;
  }, [documents, activeTab, categoryFilter, search]);

  const openDocDrawer = (doc: DocumentItem | null) => {
    setEditingDoc(doc);
    setDocDrawerOpen(true);
  };

  const openCatDrawer = (cat: DocumentCategoryItem | null) => {
    setEditingCat(cat);
    setCatDrawerOpen(true);
  };

  const handleTogglePublished = async (doc: DocumentItem) => {
    try {
      await adminFetch(`/api/admin/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !doc.published }),
      });
      toast(doc.published ? "Document unpublished" : "Document published", "success");
      fetchAll();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleToggleQuickAccess = async (doc: DocumentItem) => {
    try {
      await adminFetch(`/api/admin/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quickAccess: !doc.quickAccess }),
      });
      toast(
        doc.quickAccess ? "Removed from Quick Access" : "Added to Quick Access",
        "success",
      );
      fetchAll();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/documents/${pendingDelete.id}`, {
        method: "DELETE",
      });
      toast("Document deleted", "success");
      setPendingDelete(null);
      fetchAll();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TAB_LABELS.map((tab) => {
          const count =
            tab.key === "categories"
              ? categories.length
              : tab.key === "quick"
                ? documents.filter((d) => d.quickAccess).length
                : documents.filter((d) =>
                    d.categories.some((c) => c.section === tab.key),
                  ).length;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCategoryFilter("all");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-navy-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
        {activeTab !== "categories" ? (
          <button
            onClick={() => openDocDrawer(null)}
            className="ml-auto px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
          >
            + Add Document
          </button>
        ) : (
          <button
            onClick={() => openCatDrawer(null)}
            className="ml-auto px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
          >
            + New Category
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && activeTab !== "categories" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="all">All categories</option>
              {sectionCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Slug</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Categories</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Source</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Status</th>
                    <th className="w-12" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => openDocDrawer(doc)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium text-navy-700 max-w-[260px] truncate">
                        {doc.name}
                        {doc.quickAccess && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-50">
                            Quick
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {doc.slug}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {doc.categories.map((c) => (
                            <span
                              key={c.id}
                              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {c.title}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 capitalize">
                        {doc.external
                          ? "External"
                          : doc.storageProvider === "supabase"
                            ? "Uploaded"
                            : "Local"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePublished(doc);
                          }}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                            doc.published
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {doc.published ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="py-2 px-2 w-12">
                        <div
                          className="inline-flex"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DocumentRowMenu
                            document={doc}
                            onRequestDelete={(d) => setPendingDelete(d)}
                            onToggleQuickAccess={handleToggleQuickAccess}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                        No documents match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && activeTab === "categories" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Slug</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Section</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Docs</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    onClick={() => openCatDrawer(cat)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium text-navy-700">{cat.title}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{cat.slug}</td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{cat.section}</td>
                    <td className="py-3 px-4 text-slate-500">{cat.documentCount}</td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                      No categories yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DocumentDrawer
        open={docDrawerOpen}
        onClose={() => { setDocDrawerOpen(false); setEditingDoc(null); }}
        item={editingDoc}
        categories={categories}
        onSaved={fetchAll}
        defaultSection={activeTab !== "quick" && activeTab !== "categories" ? (activeTab as DocumentSection) : "office"}
      />

      <DocumentCategoryDrawer
        open={catDrawerOpen}
        onClose={() => { setCatDrawerOpen(false); setEditingCat(null); }}
        item={editingCat}
        onSaved={fetchAll}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Document"
        message={
          pendingDelete
            ? `This will permanently delete "${pendingDelete.name}" and its file. Agent favorites and drafts that reference this document will remain but show as missing. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete permanently"
        typeToConfirm="DELETE"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
}
