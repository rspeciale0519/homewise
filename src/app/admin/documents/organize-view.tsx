"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DragStartEvent } from "@dnd-kit/core";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";
import { OrganizeDialogs } from "./organize-dialogs";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentCategoryItem,
  DocumentItem,
  DocumentSection,
  OrganizeTab,
  OrganizeTree,
} from "./types";
import { fetchOrganizeTree, moveMembership } from "@/lib/documents-organize/api";
import { computeCrossCategoryMove } from "@/lib/documents-organize/reorder";
import {
  allCategoriesOfTree,
  categoryToItem,
  documentToItem,
} from "@/lib/documents-organize/shapers";
import { useOrganizeUrlState } from "@/lib/documents-organize/use-organize-url-state";
import { DndContextProvider } from "@/components/admin/documents-organize/dnd-context";
import { DragOverlay } from "@/components/admin/documents-organize/drag-overlay";
import { OrganizeToolbar } from "@/components/admin/documents-organize/organize-toolbar";
import { SectionBoard } from "@/components/admin/documents-organize/section-board";
import { SectionTabs } from "@/components/admin/documents-organize/section-tabs";
import { useOrganizeDragEnd } from "@/components/admin/documents-organize/use-organize-drag-end";
import { UncategorizedList } from "./uncategorized-list";
import { useUncategorizedActions } from "./use-uncategorized-actions";
import { useUncategorizedSelection } from "./use-uncategorized-selection";

const TABS: Array<{ key: OrganizeTab; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
  { key: "uncategorized", label: "Uncategorized" },
];

export function OrganizeView() {
  const { toast } = useToast();
  const router = useRouter();

  const [tree, setTree] = useState<OrganizeTree | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeTab, setActiveTab, search, setSearch } = useOrganizeUrlState();
  const [preview, setPreview] = useState(false);

  const [docDrawerOpen, setDocDrawerOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [addDocSection, setAddDocSection] =
    useState<DocumentSection>("office");
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<DocumentCategoryItem | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] =
    useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const [activeDragDoc, setActiveDragDoc] =
    useState<AdminDocumentInCategory | null>(null);
  const [activeDragCategory, setActiveDragCategory] =
    useState<AdminCategoryTree | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetchOrganizeTree();
      setTree(fresh);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const targetCategories = useMemo(() => {
    const empty: AdminCategoryTree[] = [];
    if (!tree) return { office: empty, listing: empty, sales: empty };
    return {
      office: tree.sections.office.categories,
      listing: tree.sections.listing.categories,
      sales: tree.sections.sales.categories,
    };
  }, [tree]);

  const flatCategories = useMemo(
    () => (tree ? allCategoriesOfTree(tree) : []),
    [tree],
  );

  const drawerCategories = useMemo(
    () => flatCategories.map(categoryToItem),
    [flatCategories],
  );

  const rawHandleDragEnd = useOrganizeDragEnd({
    tree,
    activeTab,
    setTree,
    onSuccess: (m) => toast(m, "success"),
    onError: (m) => toast(m, "error"),
  });

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!tree) return;
      const data = event.active.data.current as
        | {
            type?: "document" | "category";
            documentId?: string;
            categoryId?: string;
            fromCategoryId?: string;
          }
        | undefined;
      if (data?.type === "document" && data.documentId && data.fromCategoryId) {
        const cat = allCategoriesOfTree(tree).find(
          (c) => c.id === data.fromCategoryId,
        );
        const doc = cat?.documents.find((d) => d.id === data.documentId);
        if (doc) setActiveDragDoc(doc);
      } else if (data?.type === "category" && data.categoryId) {
        const cat = allCategoriesOfTree(tree).find(
          (c) => c.id === data.categoryId,
        );
        if (cat) setActiveDragCategory(cat);
      }
    },
    [tree],
  );

  const clearActiveDrag = useCallback(() => {
    setActiveDragDoc(null);
    setActiveDragCategory(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: Parameters<typeof rawHandleDragEnd>[0]) => {
      clearActiveDrag();
      await rawHandleDragEnd(event);
    },
    [rawHandleDragEnd, clearActiveDrag],
  );

  const handleMoveViaMenu = useCallback(
    async (
      doc: AdminDocumentInCategory,
      fromCategoryId: string,
      toCategoryId: string,
    ) => {
      if (!tree) return;
      const snapshot = tree;
      const toCatTree = allCategoriesOfTree(tree).find(
        (c) => c.id === toCategoryId,
      );
      if (!toCatTree) return;
      const nextTree = computeCrossCategoryMove(
        tree,
        doc.id,
        fromCategoryId,
        toCategoryId,
        toCatTree.documents.length,
      );
      setTree(nextTree);
      try {
        await moveMembership({
          documentId: doc.id,
          fromCategoryId,
          toCategoryId,
          toIndex: toCatTree.documents.length,
        });
        toast("Moved", "success");
      } catch (err) {
        setTree(snapshot);
        toast((err as Error).message, "error");
      }
    },
    [tree, toast],
  );

  const handleTogglePublish = useCallback(
    async (doc: AdminDocumentInCategory) => {
      try {
        await adminFetch(`/api/admin/documents/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify({ published: !doc.published }),
        });
        toast(doc.published ? "Unpublished" : "Published", "success");
        refetch();
      } catch (err) {
        toast((err as Error).message, "error");
      }
    },
    [refetch, toast],
  );

  const handleToggleQuickAccess = useCallback(
    async (doc: AdminDocumentInCategory) => {
      try {
        await adminFetch(`/api/admin/documents/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify({ quickAccess: !doc.quickAccess }),
        });
        toast(
          doc.quickAccess
            ? "Removed from Quick Access"
            : "Added to Quick Access",
          "success",
        );
        refetch();
      } catch (err) {
        toast((err as Error).message, "error");
      }
    },
    [refetch, toast],
  );

  const handleOpenInViewer = useCallback((doc: AdminDocumentInCategory) => {
    window.open(
      `/dashboard/documents/viewer?slug=${encodeURIComponent(doc.slug)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const handleCardClick = useCallback(
    (doc: AdminDocumentInCategory) => {
      if (preview) {
        const isPdf = (doc.storageKey ?? "").toLowerCase().endsWith(".pdf");
        if (isPdf && !doc.external) {
          router.push(
            `/dashboard/documents/viewer?slug=${encodeURIComponent(doc.slug)}`,
          );
          return;
        }
        const href = doc.external
          ? doc.url ?? "#"
          : `/api/documents/by-slug/${encodeURIComponent(doc.slug)}`;
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      setEditingDoc(documentToItem(doc, flatCategories));
      setDocDrawerOpen(true);
    },
    [preview, flatCategories, router],
  );

  const handleEditDoc = useCallback(
    (doc: AdminDocumentInCategory) => {
      setEditingDoc(documentToItem(doc, flatCategories));
      setDocDrawerOpen(true);
    },
    [flatCategories],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/documents/${pendingDelete.id}`, {
        method: "DELETE",
      });
      toast("Document deleted", "success");
      setPendingDelete(null);
      refetch();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, refetch, toast]);

  const { handleEditUncategorized, handleBulkUploaded, handleBulkDeleted } =
    useUncategorizedActions({
      setEditingDoc,
      setDocDrawerOpen,
      setBulkUploadOpen,
      setBulkOpen,
      setActiveTab,
      refetch,
      toast,
    });

  const handleAddDocument = useCallback(() => {
    setEditingDoc(null);
    setAddDocSection(activeTab === "uncategorized" ? "office" : activeTab);
    setDocDrawerOpen(true);
  }, [activeTab]);

  const handleAddDocumentToCategory = useCallback(
    (cat: AdminCategoryTree) => {
      setEditingDoc(null);
      setAddDocSection(cat.section);
      setDocDrawerOpen(true);
    },
    [],
  );

  const handleEditCategory = useCallback((cat: AdminCategoryTree) => {
    setEditingCat(categoryToItem(cat));
    setCatDrawerOpen(true);
  }, []);

  const handleAddCategory = useCallback(() => {
    setEditingCat(null);
    setCatDrawerOpen(true);
  }, []);

  const uncategorizedDocs = useMemo(
    () => tree?.uncategorized ?? [],
    [tree?.uncategorized],
  );
  const uncategorizedIds = useMemo(
    () => uncategorizedDocs.map((d) => d.id),
    [uncategorizedDocs],
  );
  const selection = useUncategorizedSelection(uncategorizedIds);

  if (loading || !tree) {
    return (
      <div className="text-center py-16">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sectionCounts = (
    Object.keys(tree.sections) as DocumentSection[]
  ).reduce(
    (acc, k) => {
      acc[k] = tree.sections[k].categories.reduce(
        (sum, c) =>
          sum +
          (preview
            ? c.documents.filter((d) => d.published).length
            : c.documents.length),
        0,
      );
      return acc;
    },
    {} as Record<DocumentSection, number>,
  );

  const uncategorizedCount = uncategorizedDocs.length;

  return (
    <div className="space-y-6">
      <SectionTabs
        tabs={TABS}
        activeTab={activeTab}
        onSelect={setActiveTab}
        counts={{
          office: sectionCounts.office,
          listing: sectionCounts.listing,
          sales: sectionCounts.sales,
          uncategorized: uncategorizedCount,
        }}
      />

      <OrganizeToolbar
        preview={preview}
        onPreviewChange={(next) => {
          setPreview(next);
          if (next) setSearch("");
        }}
        search={search}
        onSearchChange={setSearch}
        onAddDocument={handleAddDocument}
        onBulkDelete={() => setBulkOpen(true)}
        onBulkUpload={() => {
          setActiveTab("uncategorized");
          setBulkUploadOpen(true);
        }}
      />

      <div className="xl:hidden text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
        Drag-and-drop works best on larger screens. For easier organizing, open
        this page on a tablet or desktop.
      </div>

      {activeTab === "uncategorized" ? (
        <UncategorizedList
          docs={uncategorizedDocs}
          selection={selection}
          onEdit={handleEditUncategorized}
          onDelete={(d) => setPendingDelete({ id: d.id, name: d.name })}
        />
      ) : (
        <DndContextProvider
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={clearActiveDrag}
          overlay={<DragOverlay activeDragDoc={activeDragDoc} activeDragCategory={activeDragCategory} />}
        >
          <SectionBoard
            section={activeTab}
            categories={tree.sections[activeTab].categories}
            preview={preview}
            search={search}
            targetCategories={targetCategories}
            onEditCategory={handleEditCategory}
            onAddCategory={handleAddCategory}
            onAddDocumentToCategory={handleAddDocumentToCategory}
            onCardClick={handleCardClick}
            onEditDoc={handleEditDoc}
            onTogglePublish={handleTogglePublish}
            onToggleQuickAccess={handleToggleQuickAccess}
            onMoveTo={handleMoveViaMenu}
            onOpenInViewer={handleOpenInViewer}
            onDeleteDoc={(d) => setPendingDelete({ id: d.id, name: d.name })}
          />
        </DndContextProvider>
      )}

      <OrganizeDialogs
        docDrawerOpen={docDrawerOpen}
        setDocDrawerOpen={setDocDrawerOpen}
        editingDoc={editingDoc}
        setEditingDoc={setEditingDoc}
        drawerCategories={drawerCategories}
        addDocSection={addDocSection}
        catDrawerOpen={catDrawerOpen}
        setCatDrawerOpen={setCatDrawerOpen}
        editingCat={editingCat}
        setEditingCat={setEditingCat}
        pendingDelete={pendingDelete}
        deleting={deleting}
        confirmDelete={confirmDelete}
        setPendingDelete={setPendingDelete}
        bulkOpen={bulkOpen}
        setBulkOpen={setBulkOpen}
        handleBulkDeleted={handleBulkDeleted}
        refetch={refetch}
        bulkUploadOpen={bulkUploadOpen}
        setBulkUploadOpen={setBulkUploadOpen}
        handleBulkUploaded={handleBulkUploaded}
      />
    </div>
  );
}
