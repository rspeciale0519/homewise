"use client";

import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import type { DocumentSection, OrganizeTab } from "./types";
import type { UseSectionBulkMoveResult } from "./use-section-bulk-move";

interface UseOrganizeDragEndDispatchArgs {
  clearActiveDrag: () => void;
  uncategorizedDragEnd: (event: DragEndEvent) => void;
  sectionDragEnd: (event: DragEndEvent) => void;
  sectionBulkMove: Pick<
    UseSectionBulkMoveResult,
    "moveToUncategorized" | "openForTab"
  >;
  rawHandleDragEnd: (event: DragEndEvent) => Promise<void>;
}

interface ActiveData {
  type?: string;
  documentId?: string;
  fromSection?: DocumentSection;
}

interface OverData {
  type?: string;
  section?: OrganizeTab;
}

export function useOrganizeDragEndDispatch({
  clearActiveDrag,
  uncategorizedDragEnd,
  sectionDragEnd,
  sectionBulkMove,
  rawHandleDragEnd,
}: UseOrganizeDragEndDispatchArgs) {
  return useCallback(
    async (event: DragEndEvent) => {
      const activeData = event.active.data.current as ActiveData | undefined;
      const overData = event.over?.data.current as OverData | undefined;
      const activeType = activeData?.type;
      clearActiveDrag();
      if (activeType === "uncategorized-bulk") return uncategorizedDragEnd(event);
      if (activeType === "section-bulk") return sectionDragEnd(event);
      // Single-card drag from a section onto another section tab — promote
      // it to a one-doc bulk move so the picker flow matches Uncategorized.
      if (
        activeType === "document" &&
        overData?.type === "section-tab-drop" &&
        activeData?.documentId &&
        activeData.fromSection &&
        overData.section
      ) {
        const { documentId, fromSection } = activeData;
        const toSection = overData.section;
        if (toSection === "uncategorized") {
          void sectionBulkMove.moveToUncategorized({
            fromSection,
            documentIds: [documentId],
          });
        } else if (toSection !== fromSection) {
          sectionBulkMove.openForTab({
            fromSection,
            toSection,
            documentIds: [documentId],
          });
        }
        return;
      }
      await rawHandleDragEnd(event);
    },
    [
      clearActiveDrag,
      uncategorizedDragEnd,
      sectionDragEnd,
      sectionBulkMove,
      rawHandleDragEnd,
    ],
  );
}
