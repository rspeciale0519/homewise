"use client";

import { useCallback, useState } from "react";
import type { DragStartEvent } from "@dnd-kit/core";
import { allCategoriesOfTree } from "@/lib/documents-organize/shapers";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  AdminUncategorizedDoc,
  DocumentSection,
  OrganizeTree,
} from "./types";

export type DragIntent =
  | null
  | "in-section"
  | "category-reorder"
  | "uncategorized-bulk"
  | "section-bulk";

interface UseOrganizeDragStateArgs {
  tree: OrganizeTree | null;
  uncategorizedDocs: AdminUncategorizedDoc[];
}

export interface UseOrganizeDragStateResult {
  activeDragDoc: AdminDocumentInCategory | null;
  activeDragCategory: AdminCategoryTree | null;
  activeDragBulkDocs: Array<{ id: string; name: string }>;
  dragIntent: DragIntent;
  handleDragStart: (event: DragStartEvent) => void;
  clearActiveDrag: () => void;
}

export function useOrganizeDragState({
  tree,
  uncategorizedDocs,
}: UseOrganizeDragStateArgs): UseOrganizeDragStateResult {
  const [activeDragDoc, setActiveDragDoc] =
    useState<AdminDocumentInCategory | null>(null);
  const [activeDragCategory, setActiveDragCategory] =
    useState<AdminCategoryTree | null>(null);
  const [activeDragBulkDocs, setActiveDragBulkDocs] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [dragIntent, setDragIntent] = useState<DragIntent>(null);

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

  return {
    activeDragDoc,
    activeDragCategory,
    activeDragBulkDocs,
    dragIntent,
    handleDragStart,
    clearActiveDrag,
  };
}
