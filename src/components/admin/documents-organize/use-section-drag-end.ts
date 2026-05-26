"use client";

import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import type { DocumentSection } from "@/app/admin/documents/types";

interface SectionBulkActiveData {
  type?: string;
  documentIds?: string[];
  primaryDocId?: string;
  fromSection?: DocumentSection;
}

interface SectionTabDropData {
  type?: string;
  section?: DocumentSection;
}

interface CategoryDropData {
  type?: string;
  categoryId?: string;
}

export type SectionBulkDrop =
  | {
      kind: "tab";
      fromSection: DocumentSection;
      toSection: DocumentSection | "uncategorized";
      documentIds: string[];
    }
  | {
      kind: "category";
      fromSection: DocumentSection;
      toCategoryId: string;
      documentIds: string[];
    };

interface UseSectionDragEndArgs {
  onSectionBulkDrop: (drop: SectionBulkDrop) => void;
}

export function useSectionDragEnd({
  onSectionBulkDrop,
}: UseSectionDragEndArgs) {
  return useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeData = active.data.current as
        | SectionBulkActiveData
        | undefined;
      if (activeData?.type !== "section-bulk") return;

      const ids = activeData.documentIds ?? [];
      const fromSection = activeData.fromSection;
      if (ids.length === 0 || !fromSection) return;

      const overData = over.data.current as
        | (SectionTabDropData & CategoryDropData)
        | undefined;

      if (overData?.type === "section-tab-drop" && overData.section) {
        onSectionBulkDrop({
          kind: "tab",
          fromSection,
          toSection: overData.section,
          documentIds: ids,
        });
        return;
      }

      // category drop targets: explicit category-drop wrappers, the
      // category header sortable, the empty-state placeholder, or a
      // sibling document card (whose fromCategoryId identifies the
      // hovered category).
      const targetCategoryId =
        overData?.type === "category-drop"
          ? overData.categoryId
          : overData?.type === "category"
            ? overData.categoryId
            : overData?.type === "empty-category"
              ? overData.categoryId
              : overData?.type === "document"
                ? (over.data.current as { fromCategoryId?: string })
                    .fromCategoryId
                : undefined;

      if (!targetCategoryId) return;

      onSectionBulkDrop({
        kind: "category",
        fromSection,
        toCategoryId: targetCategoryId,
        documentIds: ids,
      });
    },
    [onSectionBulkDrop],
  );
}
