"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
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
import { fetchOrganizeTree } from "@/lib/documents-organize/api";
import {
  allCategoriesOfTree,
  categoryToItem,
} from "@/lib/documents-organize/shapers";
import { useOrganizeUrlState } from "@/lib/documents-organize/use-organize-url-state";
import { DndContextProvider } from "@/components/admin/documents-organize/dnd-context";
import { DragOverlay } from "@/components/admin/documents-organize/drag-overlay";
import { OrganizeToolbar } from "@/components/admin/documents-organize/organize-toolbar";
import { SectionBoard } from "@/components/admin/documents-organize/section-board";
import { SectionTabs } from "@/components/admin/documents-organize/section-tabs";
import { useOrganizeDragEnd } from "@/components/admin/documents-organize/use-organize-drag-end";
import { useUncategorizedDragEnd } from "@/components/admin/documents-organize/use-uncategorized-drag-end";
import { useSectionDragEnd } from "@/components/admin/documents-organize/use-section-drag-end";
import { UncategorizedList } from "./uncategorized-list";
import { useUncategorizedActions } from "./use-uncategorized-actions";
import { useDocumentSelection } from "./use-document-selection";
import { useDocActions } from "./use-doc-actions";
import { useUncategorizedBulkCategorize } from "./use-uncategorized-bulk-categorize";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";

type DragIntent =
  | null
  | "in-section"
  | "category-reorder"
  | "uncategorized-bulk"
  | "section-bulk";

const TABS: Array<{ key: OrganizeTab; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
  { key: "uncategorized", label: "Uncategorized" },
];

export function OrganizeView() {
  const { toast, toastWithUndo } = useToast();
  const router = useRouter();
  const [autoSwitch, setAutoSwitch] = usePersistedBoolean(
    "homewise.organize.autoSwitchOnAssign",
    true,
  );

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
  const [activeDragBulkDocs, setActiveDragBulkDocs] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [dragIntent, setDragIntent] = useState<DragIntent>(null);

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

  const uncategorizedDocs = useMemo(
    () => tree?.uncategorized ?? [],
    [tree?.uncategorized],
  );
  const uncategorizedIds = useMemo(
    () => uncategorizedDocs.map((d) => d.id),
    [uncategorizedDocs],
  );

  // The selection hook operates on the active tab's flat doc-ID list. When
  // activeTab changes, the list changes and selection auto-prunes — so
  // switching tabs effectively clears selection (a doc visible only on the
  // prior tab is no longer in orderedIds).
  const activeTabDocIds = useMemo(() => {
    if (activeTab === "uncategorized") return uncategorizedIds;
    if (!tree) return [] as string[];
    return tree.sections[activeTab].categories.flatMap((c) =>
      c.documents.map((d) => d.id),
    );
  }, [activeTab, uncategorizedIds, tree]);
  const selection = useDocumentSelection(activeTabDocIds);

  const docActions = useDocActions({
    tree,
    setTree,
    flatCategories,
    preview,
    router,
    toast,
    refetch,
    setEditingDoc,
    setDocDrawerOpen,
  });

  const rawHandleDragEnd = useOrganizeDragEnd({
    tree,
    activeTab,
    setTree,
    onSuccess: (m) => toast(m, "success"),
    onError: (m) => toast(m, "error"),
  });

  const bulkCategorize = useUncategorizedBulkCategorize({
    tree,
    setTree,
    uncategorizedDocs,
    uncategorizedIds,
    selection,
    setActiveTab,
    refetch,
    toast,
    toastWithUndo,
    autoSwitch,
  });

  const uncategorizedDragEnd = useUncategorizedDragEnd({
    onBulkDropOnSection: bulkCategorize.openForSection,
  });

  const sectionDragEnd = useSectionDragEnd({
    onSectionBulkDrop: (drop) => {
      // Phase 4: log-only. Phase 5/6/6b will wire to the picker + bulk-move
      // endpoint.
      console.log("[section-bulk drop]", drop);
    },
  });

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as
        | {
            type?:
              | "document"
              | "category"
              | "uncategorized-bulk"
              | "section-bulk";
            documentId?: string;
            categoryId?: string;
            fromCategoryId?: string;
            fromSection?: DocumentSection;
            documentIds?: string[];
            primaryDocId?: string;
          }
        | undefined;
      if (data?.type === "uncategorized-bulk") {
        const ids = new Set(data.documentIds ?? []);
        const primaryId = data.primaryDocId;
        const inOrder = uncategorizedDocs.filter((d) => ids.has(d.id));
        const reordered = primaryId
          ? [
              ...inOrder.filter((d) => d.id === primaryId),
              ...inOrder.filter((d) => d.id !== primaryId),
            ]
          : inOrder;
        setActiveDragBulkDocs(reordered);
        setDragIntent("uncategorized-bulk");
        return;
      }
      if (data?.type === "section-bulk" && tree && data.fromSection) {
        const ids = new Set(data.documentIds ?? []);
        const primaryId = data.primaryDocId;
        const allInSection = tree.sections[data.fromSection].categories.flatMap(
          (c) => c.documents,
        );
        const inOrder = allInSection.filter((d) => ids.has(d.id));
        const reordered = primaryId
          ? [
              ...inOrder.filter((d) => d.id === primaryId),
              ...inOrder.filter((d) => d.id !== primaryId),
            ]
          : inOrder;
        setActiveDragBulkDocs(reordered);
        setDragIntent("section-bulk");
        return;
      }
      if (!tree) return;
      if (data?.type === "document" && data.documentId && data.fromCategoryId) {
        const cat = allCategoriesOfTree(tree).find(
          (c) => c.id === data.fromCategoryId,
        );
        const doc = cat?.documents.find((d) => d.id === data.documentId);
        if (doc) setActiveDragDoc(doc);
        setDragIntent("in-section");
      } else if (data?.type === "category" && data.categoryId) {
        const cat = allCategoriesOfTree(tree).find(
          (c) => c.id === data.categoryId,
        );
        if (cat) setActiveDragCategory(cat);
        setDragIntent("category-reorder");
      }
    },
    [tree, uncategorizedDocs],
  );

  const clearActiveDrag = useCallback(() => {
    setActiveDragDoc(null);
    setActiveDragCategory(null);
    setActiveDragBulkDocs([]);
    setDragIntent(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const activeType = event.active.data.current?.type as string | undefined;
      clearActiveDrag();
      if (activeType === "uncategorized-bulk") {
        uncategorizedDragEnd(event);
      } else if (activeType === "section-bulk") {
        sectionDragEnd(event);
      } else {
        await rawHandleDragEnd(event);
      }
    },
    [clearActiveDrag, uncategorizedDragEnd, sectionDragEnd, rawHandleDragEnd],
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

  const handleAddDocumentToCategory = useCallback((cat: AdminCategoryTree) => {
    setEditingDoc(null);
    setAddDocSection(cat.section);
    setDocDrawerOpen(true);
  }, []);

  const handleEditCategory = useCallback((cat: AdminCategoryTree) => {
    setEditingCat(categoryToItem(cat));
    setCatDrawerOpen(true);
  }, []);

  const handleAddCategory = useCallback(() => {
    setEditingCat(null);
    setCatDrawerOpen(true);
  }, []);

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
      <DndContextProvider
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={clearActiveDrag}
        overlay={
          <DragOverlay
            activeDragDoc={activeDragDoc}
            activeDragCategory={activeDragCategory}
            activeDragBulkDocs={activeDragBulkDocs}
          />
        }
      >
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
          acceptsBulkDrop={
            dragIntent === "uncategorized-bulk" || dragIntent === "section-bulk"
          }
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
          autoSwitch={autoSwitch}
          onAutoSwitchChange={setAutoSwitch}
        />

        <div className="xl:hidden text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          On a phone or tablet, tap checkboxes to select, then use the Move
          button to assign. Drag-and-drop also works on touch but the desktop
          path is faster.
        </div>

        {activeTab === "uncategorized" ? (
          <UncategorizedList
            docs={uncategorizedDocs}
            selection={selection}
            onEdit={handleEditUncategorized}
            onDelete={(d) => setPendingDelete({ id: d.id, name: d.name })}
            onMoveSelected={bulkCategorize.openForCurrentSelection}
          />
        ) : (
          <SectionBoard
            section={activeTab}
            categories={tree.sections[activeTab].categories}
            preview={preview}
            search={search}
            selection={selection}
            selectionActive={selection.selectedCount > 0}
            targetCategories={targetCategories}
            onEditCategory={handleEditCategory}
            onAddCategory={handleAddCategory}
            onAddDocumentToCategory={handleAddDocumentToCategory}
            onCardClick={docActions.handleCardClick}
            onEditDoc={docActions.handleEditDoc}
            onTogglePublish={docActions.handleTogglePublish}
            onToggleQuickAccess={docActions.handleToggleQuickAccess}
            onMoveTo={docActions.handleMoveViaMenu}
            onOpenInViewer={docActions.handleOpenInViewer}
            onDeleteDoc={(d) => setPendingDelete({ id: d.id, name: d.name })}
          />
        )}
      </DndContextProvider>

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
        pickerOpen={bulkCategorize.pickerOpen}
        pickerSection={bulkCategorize.pickerSection}
        pickerDocumentCount={bulkCategorize.pickerDocumentCount}
        sectionsToCategories={targetCategories}
        onPickerCancel={bulkCategorize.cancelPicker}
        onPickerConfirm={bulkCategorize.confirmPicker}
      />
    </div>
  );
}
