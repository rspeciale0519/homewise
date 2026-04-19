"use client";

import { useCallback, useRef } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  computeCategoryReorder,
  computeCrossCategoryMove,
  computeDocReorder,
} from "@/lib/documents-organize/reorder";
import {
  moveMembership,
  reorderCategories,
  reorderMemberships,
} from "@/lib/documents-organize/api";
import type {
  DocumentSection,
  OrganizeTree,
} from "@/app/admin/documents/types";

type ActiveData =
  | { type: "document"; documentId: string; fromCategoryId: string }
  | { type: "category"; categoryId: string };

type OverData =
  | { type: "document"; documentId: string; fromCategoryId: string }
  | { type: "category"; categoryId: string }
  | { type: "empty-category"; categoryId: string };

interface UseOrganizeDragEndArgs {
  tree: OrganizeTree | null;
  activeTab: DocumentSection;
  setTree: (next: OrganizeTree) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function useOrganizeDragEnd({
  tree,
  activeTab,
  setTree,
  onSuccess,
  onError,
}: UseOrganizeDragEndArgs) {
  const snapshotRef = useRef<OrganizeTree | null>(null);

  return useCallback(
    async (event: DragEndEvent) => {
      if (!tree) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeData = active.data.current as ActiveData | undefined;
      const overData = over.data.current as OverData | undefined;
      if (!activeData) return;

      snapshotRef.current = tree;

      if (activeData.type === "category") {
        const overCategoryId =
          overData?.type === "category" ? overData.categoryId : null;
        if (!overCategoryId) return;

        const cats = tree.sections[activeTab].categories;
        const fromIdx = cats.findIndex((c) => c.id === activeData.categoryId);
        const toIdx = cats.findIndex((c) => c.id === overCategoryId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

        const reordered = computeCategoryReorder(cats, fromIdx, toIdx);
        setTree({
          sections: {
            ...tree.sections,
            [activeTab]: { categories: reordered },
          },
        });

        try {
          await reorderCategories(
            activeTab,
            reordered.map((c) => c.id),
          );
          onSuccess("Order saved");
        } catch (err) {
          if (snapshotRef.current) setTree(snapshotRef.current);
          onError((err as Error).message);
        }
        return;
      }

      if (activeData.type !== "document") return;

      const fromCategoryId = activeData.fromCategoryId;
      const toCategoryId =
        overData?.type === "document"
          ? overData.fromCategoryId
          : overData?.type === "category"
            ? overData.categoryId
            : overData?.type === "empty-category"
              ? overData.categoryId
              : null;
      if (!toCategoryId) return;

      if (fromCategoryId === toCategoryId) {
        const cat = tree.sections[activeTab].categories.find(
          (c) => c.id === fromCategoryId,
        );
        if (!cat) return;
        const fromIdx = cat.documents.findIndex(
          (d) => d.id === activeData.documentId,
        );
        const toIdx =
          overData?.type === "document"
            ? cat.documents.findIndex((d) => d.id === overData.documentId)
            : cat.documents.length - 1;
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

        const reordered = computeDocReorder(cat.documents, fromIdx, toIdx);
        const nextCats = tree.sections[activeTab].categories.map((c) =>
          c.id === fromCategoryId ? { ...c, documents: reordered } : c,
        );
        setTree({
          sections: {
            ...tree.sections,
            [activeTab]: { categories: nextCats },
          },
        });

        try {
          await reorderMemberships(
            fromCategoryId,
            reordered.map((d) => d.id),
          );
          onSuccess("Order saved");
        } catch (err) {
          if (snapshotRef.current) setTree(snapshotRef.current);
          onError((err as Error).message);
        }
        return;
      }

      const toCat = tree.sections[activeTab].categories.find(
        (c) => c.id === toCategoryId,
      );
      if (!toCat) return;
      const toIndex =
        overData?.type === "document"
          ? toCat.documents.findIndex((d) => d.id === overData.documentId)
          : toCat.documents.length;
      const clampedIndex = toIndex === -1 ? toCat.documents.length : toIndex;

      const nextTree = computeCrossCategoryMove(
        tree,
        activeData.documentId,
        fromCategoryId,
        toCategoryId,
        clampedIndex,
      );
      setTree(nextTree);

      try {
        await moveMembership({
          documentId: activeData.documentId,
          fromCategoryId,
          toCategoryId,
          toIndex: clampedIndex,
        });
        onSuccess("Moved");
      } catch (err) {
        if (snapshotRef.current) setTree(snapshotRef.current);
        onError((err as Error).message);
      }
    },
    [tree, activeTab, setTree, onSuccess, onError],
  );
}
