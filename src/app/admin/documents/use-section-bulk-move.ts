"use client";

import { useCallback, useState } from "react";
import { bulkMoveMemberships } from "@/lib/documents-organize/bulk-membership";
import { computeBulkMoveBetweenCategories } from "@/lib/documents-organize/reorder";
import type {
  DocumentSection,
  OrganizeTab,
  OrganizeTree,
} from "./types";
import type { UseDocumentSelectionResult } from "./use-document-selection";

type ToastFn = (
  message: string,
  type: "success" | "error" | "info",
) => void;

interface PendingPicker {
  fromSection: DocumentSection;
  /** Undefined when the user must pick a section first (toolbar button path). */
  toSection?: DocumentSection;
  documentIds: string[];
}

interface UseSectionBulkMoveArgs {
  tree: OrganizeTree | null;
  setTree: (next: OrganizeTree) => void;
  selection: UseDocumentSelectionResult;
  setActiveTab: (tab: OrganizeTab) => void;
  refetch: () => Promise<void>;
  toast: ToastFn;
  autoSwitch: boolean;
}

export interface UseSectionBulkMoveResult {
  pickerOpen: boolean;
  pickerSection: DocumentSection | undefined;
  pickerDocumentCount: number;
  openForTab: (args: {
    fromSection: DocumentSection;
    toSection: DocumentSection;
    documentIds: string[];
  }) => void;
  /** Toolbar/menu button path — picker shows section step first. */
  openForCurrentSelection: (args: {
    fromSection: DocumentSection;
    documentIds: string[];
  }) => void;
  moveToCategory: (args: {
    fromSection: DocumentSection;
    toCategoryId: string;
    documentIds: string[];
  }) => Promise<void>;
  moveToUncategorized: (args: {
    fromSection: DocumentSection;
    documentIds: string[];
  }) => Promise<void>;
  cancelPicker: () => void;
  confirmPicker: (args: {
    section: DocumentSection;
    categoryId: string;
    categoryTitle: string;
  }) => Promise<void>;
}

function buildMoves(
  tree: OrganizeTree,
  fromSection: DocumentSection,
  documentIds: string[],
): Array<{ documentId: string; fromCategoryId: string }> {
  const docToCategory = new Map<string, string>();
  for (const cat of tree.sections[fromSection].categories) {
    for (const doc of cat.documents) {
      if (documentIds.includes(doc.id)) docToCategory.set(doc.id, cat.id);
    }
  }
  return documentIds.flatMap((id) => {
    const fromCategoryId = docToCategory.get(id);
    return fromCategoryId ? [{ documentId: id, fromCategoryId }] : [];
  });
}

function findCategorySection(
  tree: OrganizeTree,
  categoryId: string,
): { section: DocumentSection; title: string } | null {
  for (const sec of Object.keys(tree.sections) as DocumentSection[]) {
    const cat = tree.sections[sec].categories.find((c) => c.id === categoryId);
    if (cat) return { section: sec, title: cat.title };
  }
  return null;
}

export function useSectionBulkMove({
  tree,
  setTree,
  selection,
  setActiveTab,
  refetch,
  toast,
  autoSwitch,
}: UseSectionBulkMoveArgs): UseSectionBulkMoveResult {
  const [pending, setPending] = useState<PendingPicker | null>(null);

  const moveToCategory = useCallback(
    async (args: {
      fromSection: DocumentSection;
      toCategoryId: string;
      documentIds: string[];
    }) => {
      const { fromSection, toCategoryId, documentIds } = args;
      if (!tree || documentIds.length === 0) return;

      const target = findCategorySection(tree, toCategoryId);
      if (!target) {
        toast("Target category no longer exists", "error");
        await refetch();
        return;
      }

      const moves = buildMoves(tree, fromSection, documentIds);
      if (moves.length === 0) return;

      // No-op when every doc is already in the target category and there
      // is no source-removal work to do (i.e. user dropped within the same
      // category). Same-category sortable reorders are handled by the
      // single-doc path, not this orchestrator.
      const realMoves = moves.filter((m) => m.fromCategoryId !== toCategoryId);
      if (realMoves.length === 0) return;

      const snapshot = tree;
      const nextTree = computeBulkMoveBetweenCategories({
        tree,
        moves: realMoves,
        toCategoryId,
      });
      setTree(nextTree);
      selection.clear();
      if (autoSwitch && target.section !== fromSection) {
        setActiveTab(target.section);
      }

      try {
        const result = await bulkMoveMemberships({
          toCategoryId,
          moves: realMoves,
        });
        const okN = result.moved.length;
        const failN = result.failed.length;
        const skipN = result.skipped.length;
        const total = realMoves.length;

        if (okN === total) {
          toast(`Moved ${okN} to ${target.title}`, "success");
          return;
        }
        if (okN > 0) {
          const detail = [
            failN > 0 ? `${failN} unavailable` : null,
            skipN > 0 ? `${skipN} already there` : null,
          ]
            .filter(Boolean)
            .join(", ");
          toast(
            `Moved ${okN} of ${total} to ${target.title} — ${detail}`,
            "error",
          );
          await refetch();
          return;
        }
        setTree(snapshot);
        toast(`Could not move any documents to ${target.title}`, "error");
        await refetch();
      } catch (err) {
        setTree(snapshot);
        toast((err as Error).message, "error");
      }
    },
    [tree, setTree, selection, setActiveTab, refetch, toast, autoSwitch],
  );

  const moveToUncategorized = useCallback(
    async (args: {
      fromSection: DocumentSection;
      documentIds: string[];
    }) => {
      const { fromSection, documentIds } = args;
      if (!tree || documentIds.length === 0) return;

      const moves = buildMoves(tree, fromSection, documentIds);
      if (moves.length === 0) return;

      const snapshot = tree;
      const nextTree = computeBulkMoveBetweenCategories({
        tree,
        moves,
        toCategoryId: null,
      });
      setTree(nextTree);
      selection.clear();

      try {
        const result = await bulkMoveMemberships({
          toCategoryId: null,
          moves,
        });
        const okN = result.moved.length;
        const failN = result.failed.length;
        const total = moves.length;

        if (okN === total) {
          toast(`Removed ${okN} from category`, "success");
          return;
        }
        if (okN > 0) {
          toast(
            `Removed ${okN} of ${total}${failN > 0 ? ` — ${failN} unavailable` : ""}`,
            "error",
          );
          await refetch();
          return;
        }
        setTree(snapshot);
        toast("Could not remove any documents", "error");
        await refetch();
      } catch (err) {
        setTree(snapshot);
        toast((err as Error).message, "error");
      }
    },
    [tree, setTree, selection, refetch, toast],
  );

  const openForTab = useCallback(
    (args: {
      fromSection: DocumentSection;
      toSection: DocumentSection;
      documentIds: string[];
    }) => {
      if (args.documentIds.length === 0) return;
      setPending(args);
    },
    [],
  );

  const openForCurrentSelection = useCallback(
    (args: { fromSection: DocumentSection; documentIds: string[] }) => {
      if (args.documentIds.length === 0) return;
      setPending({ ...args, toSection: undefined });
    },
    [],
  );

  const cancelPicker = useCallback(() => setPending(null), []);

  const confirmPicker = useCallback(
    async (args: {
      section: DocumentSection;
      categoryId: string;
      categoryTitle: string;
    }) => {
      if (!pending) return;
      const { fromSection, documentIds } = pending;
      setPending(null);
      await moveToCategory({
        fromSection,
        toCategoryId: args.categoryId,
        documentIds,
      });
    },
    [pending, moveToCategory],
  );

  return {
    pickerOpen: pending !== null,
    pickerSection: pending?.toSection,
    pickerDocumentCount: pending?.documentIds.length ?? 0,
    openForTab,
    openForCurrentSelection,
    moveToCategory,
    moveToUncategorized,
    cancelPicker,
    confirmPicker,
  };
}
