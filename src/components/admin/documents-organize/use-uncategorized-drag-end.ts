"use client";

import { useCallback } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import type { DocumentSection } from "@/app/admin/documents/types";

interface UncategorizedDragData {
  type?: string;
  documentIds?: string[];
}

interface SectionTabDropData {
  type?: string;
  section?: DocumentSection;
}

interface UseUncategorizedDragEndArgs {
  onBulkDropOnSection: (
    section: DocumentSection,
    documentIds: string[],
  ) => void;
}

export function useUncategorizedDragEnd({
  onBulkDropOnSection,
}: UseUncategorizedDragEndArgs) {
  return useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeData = active.data.current as
        | UncategorizedDragData
        | undefined;
      const overData = over.data.current as SectionTabDropData | undefined;
      if (activeData?.type !== "uncategorized-bulk") return;
      if (overData?.type !== "section-tab-drop") return;
      if (!overData.section) return;
      const ids = activeData.documentIds ?? [];
      if (ids.length === 0) return;
      onBulkDropOnSection(overData.section, ids);
    },
    [onBulkDropOnSection],
  );
}
