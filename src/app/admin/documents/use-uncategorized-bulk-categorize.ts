"use client";

import { useCallback, useState } from "react";
import {
  bulkAssignMemberships,
  bulkUnassignMemberships,
} from "@/lib/documents-organize/bulk-membership";
import {
  computeBulkAssignFromUncategorized,
  computeBulkUnassign,
} from "@/lib/documents-organize/reorder";
import type {
  AdminUncategorizedDoc,
  DocumentSection,
  OrganizeTab,
  OrganizeTree,
} from "./types";
import type { UseUncategorizedSelectionResult } from "./use-uncategorized-selection";

type ToastFn = (
  message: string,
  type: "success" | "error" | "info",
) => void;

type ToastWithUndoFn = (opts: {
  message: string;
  undoLabel?: string;
  durationMs?: number;
  onUndo: () => void;
}) => void;

interface PendingPicker {
  /** When undefined, picker opens at the section-selection step. */
  section: DocumentSection | undefined;
  documentIds: string[];
}

interface UseUncategorizedBulkCategorizeArgs {
  tree: OrganizeTree | null;
  setTree: (next: OrganizeTree) => void;
  uncategorizedDocs: AdminUncategorizedDoc[];
  uncategorizedIds: readonly string[];
  selection: UseUncategorizedSelectionResult;
  setActiveTab: (tab: OrganizeTab) => void;
  refetch: () => Promise<void>;
  toast: ToastFn;
  toastWithUndo: ToastWithUndoFn;
  autoSwitch: boolean;
}

export interface UseUncategorizedBulkCategorizeResult {
  pickerOpen: boolean;
  pickerSection: DocumentSection | undefined;
  pickerDocumentCount: number;
  /** Drag path: section is fixed by the tab the user dropped on. */
  openForSection: (section: DocumentSection, documentIds: string[]) => void;
  /** Button path: shows section-pick step first. */
  openForCurrentSelection: () => void;
  cancelPicker: () => void;
  confirmPicker: (args: {
    section: DocumentSection;
    categoryId: string;
    categoryTitle: string;
  }) => Promise<void>;
}

export function useUncategorizedBulkCategorize({
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
}: UseUncategorizedBulkCategorizeArgs): UseUncategorizedBulkCategorizeResult {
  const [pending, setPending] = useState<PendingPicker | null>(null);

  const undoAssign = useCallback(
    async (categoryId: string, documentIds: string[]) => {
      try {
        await bulkUnassignMemberships({ categoryId, documentIds });
        toast("Undone", "success");
      } catch (err) {
        toast((err as Error).message, "error");
      } finally {
        await refetch();
      }
    },
    [refetch, toast],
  );

  const runAssign = useCallback(
    async (args: {
      section: DocumentSection;
      categoryId: string;
      categoryTitle: string;
      documentIds: string[];
    }) => {
      const { section, categoryId, categoryTitle, documentIds } = args;
      if (!tree || documentIds.length === 0) return;

      const snapshot = tree;
      const nextTree = computeBulkAssignFromUncategorized({
        tree,
        documentIds,
        toCategoryId: categoryId,
        uncategorizedDocs,
      });
      setTree(nextTree);
      selection.clear();
      if (autoSwitch) setActiveTab(section);

      try {
        const result = await bulkAssignMemberships({
          categoryId,
          documentIds,
        });
        const okIds = result.assigned.map((a) => a.documentId);
        const okN = okIds.length;
        const failN = result.failed.length;
        const skipN = result.skipped.length;
        const total = documentIds.length;

        if (okN === total) {
          toastWithUndo({
            message: `Assigned ${okN} to ${categoryTitle}`,
            onUndo: () => {
              void undoAssign(categoryId, okIds);
            },
          });
          return;
        }
        if (okN > 0) {
          const detail = [
            failN > 0 ? `${failN} unavailable` : null,
            skipN > 0 ? `${skipN} already in category` : null,
          ]
            .filter(Boolean)
            .join(", ");
          toast(
            `Assigned ${okN} of ${total} to ${categoryTitle} — ${detail}`,
            "error",
          );
          await refetch();
          return;
        }
        setTree(snapshot);
        toast(
          `Could not move any documents to ${categoryTitle}`,
          "error",
        );
        await refetch();
      } catch (err) {
        setTree(snapshot);
        toast((err as Error).message, "error");
      }
    },
    [
      tree,
      setTree,
      uncategorizedDocs,
      selection,
      setActiveTab,
      refetch,
      toast,
      toastWithUndo,
      autoSwitch,
      undoAssign,
    ],
  );

  const openForSection = useCallback(
    (section: DocumentSection, documentIds: string[]) => {
      if (documentIds.length === 0) return;
      setPending({ section, documentIds });
    },
    [],
  );

  const openForCurrentSelection = useCallback(() => {
    if (selection.selectedCount === 0) return;
    const documentIds = uncategorizedIds.filter((id) =>
      selection.selectedIds.has(id),
    );
    if (documentIds.length === 0) return;
    setPending({ section: undefined, documentIds });
  }, [selection, uncategorizedIds]);

  const cancelPicker = useCallback(() => {
    setPending(null);
  }, []);

  const confirmPicker = useCallback(
    async (args: {
      section: DocumentSection;
      categoryId: string;
      categoryTitle: string;
    }) => {
      if (!pending) return;
      const { documentIds } = pending;
      setPending(null);
      await runAssign({ ...args, documentIds });
    },
    [pending, runAssign],
  );

  return {
    pickerOpen: pending !== null,
    pickerSection: pending?.section,
    pickerDocumentCount: pending?.documentIds.length ?? 0,
    openForSection,
    openForCurrentSelection,
    cancelPicker,
    confirmPicker,
  };
}

export { bulkUnassignMemberships, computeBulkUnassign };
