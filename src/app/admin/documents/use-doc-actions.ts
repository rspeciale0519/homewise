"use client";

import { useCallback } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { adminFetch } from "@/lib/admin-fetch";
import { moveMembership } from "@/lib/documents-organize/api";
import { computeCrossCategoryMove } from "@/lib/documents-organize/reorder";
import {
  allCategoriesOfTree,
  documentToItem,
} from "@/lib/documents-organize/shapers";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentItem,
  OrganizeTree,
} from "./types";

interface UseDocActionsArgs {
  tree: OrganizeTree | null;
  setTree: (next: OrganizeTree) => void;
  flatCategories: AdminCategoryTree[];
  preview: boolean;
  router: AppRouterInstance;
  toast: (message: string, kind: "success" | "error" | "info") => void;
  refetch: () => Promise<void>;
  setEditingDoc: (item: DocumentItem | null) => void;
  setDocDrawerOpen: (open: boolean) => void;
}

export interface UseDocActionsResult {
  handleTogglePublish: (doc: AdminDocumentInCategory) => Promise<void>;
  handleToggleQuickAccess: (doc: AdminDocumentInCategory) => Promise<void>;
  handleOpenInViewer: (doc: AdminDocumentInCategory) => void;
  handleCardClick: (doc: AdminDocumentInCategory) => void;
  handleEditDoc: (doc: AdminDocumentInCategory) => void;
  handleMoveViaMenu: (
    doc: AdminDocumentInCategory,
    fromCategoryId: string,
    toCategoryId: string,
  ) => Promise<void>;
}

export function useDocActions({
  tree,
  setTree,
  flatCategories,
  preview,
  router,
  toast,
  refetch,
  setEditingDoc,
  setDocDrawerOpen,
}: UseDocActionsArgs): UseDocActionsResult {
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
    [preview, flatCategories, router, setEditingDoc, setDocDrawerOpen],
  );

  const handleEditDoc = useCallback(
    (doc: AdminDocumentInCategory) => {
      setEditingDoc(documentToItem(doc, flatCategories));
      setDocDrawerOpen(true);
    },
    [flatCategories, setEditingDoc, setDocDrawerOpen],
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
    [tree, setTree, toast],
  );

  return {
    handleTogglePublish,
    handleToggleQuickAccess,
    handleOpenInViewer,
    handleCardClick,
    handleEditDoc,
    handleMoveViaMenu,
  };
}
