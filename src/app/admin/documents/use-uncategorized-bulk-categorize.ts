"use client";

import { useCallback } from "react";
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

type ToastFn = (
  message: string,
  type: "success" | "error" | "info",
) => void;

interface UseUncategorizedBulkCategorizeArgs {
  tree: OrganizeTree | null;
  setTree: (next: OrganizeTree) => void;
  uncategorizedDocs: AdminUncategorizedDoc[];
  setActiveTab: (tab: OrganizeTab) => void;
  clearSelection: () => void;
  refetch: () => Promise<void>;
  toast: ToastFn;
  autoSwitch: boolean;
}

interface AssignArgs {
  section: DocumentSection;
  categoryId: string;
  categoryTitle: string;
  documentIds: string[];
}

export interface UseUncategorizedBulkCategorizeResult {
  assignFromUncategorized: (args: AssignArgs) => Promise<void>;
}

export function useUncategorizedBulkCategorize({
  tree,
  setTree,
  uncategorizedDocs,
  setActiveTab,
  clearSelection,
  refetch,
  toast,
  autoSwitch,
}: UseUncategorizedBulkCategorizeArgs): UseUncategorizedBulkCategorizeResult {
  const assignFromUncategorized = useCallback(
    async ({ section, categoryId, categoryTitle, documentIds }: AssignArgs) => {
      if (!tree || documentIds.length === 0) return;

      const snapshot = tree;
      const nextTree = computeBulkAssignFromUncategorized({
        tree,
        documentIds,
        toCategoryId: categoryId,
        uncategorizedDocs,
      });
      setTree(nextTree);
      clearSelection();
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
          toast(`Assigned ${okN} to ${categoryTitle}`, "success");
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
        // okN === 0: nothing succeeded
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
      setActiveTab,
      clearSelection,
      refetch,
      toast,
      autoSwitch,
    ],
  );

  return { assignFromUncategorized };
}

// Phase 5 will export an undoAssignment helper here. Keeping the import so it
// is wired and ready when toast-with-undo lands.
export { bulkUnassignMemberships, computeBulkUnassign };
