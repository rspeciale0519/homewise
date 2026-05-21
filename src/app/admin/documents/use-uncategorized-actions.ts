"use client";

import { useCallback } from "react";
import { uncategorizedToDocumentItem } from "@/lib/documents-organize/shapers";
import type { BulkCreateResult } from "@/lib/documents/bulk-upload";
import type { BulkDeleteResult } from "@/lib/documents/bulk-delete";
import type { AdminUncategorizedDoc, DocumentItem, OrganizeTab } from "./types";

interface Deps {
  setEditingDoc: (item: DocumentItem) => void;
  setDocDrawerOpen: (open: boolean) => void;
  setBulkUploadOpen: (open: boolean) => void;
  setBulkOpen: (open: boolean) => void;
  setActiveTab: (tab: OrganizeTab) => void;
  refetch: () => void;
  toast: (message: string, kind: "success" | "error") => void;
}

export function useUncategorizedActions(deps: Deps) {
  const {
    setEditingDoc,
    setDocDrawerOpen,
    setBulkUploadOpen,
    setBulkOpen,
    setActiveTab,
    refetch,
    toast,
  } = deps;

  const handleEditUncategorized = useCallback(
    (doc: AdminUncategorizedDoc) => {
      setEditingDoc(uncategorizedToDocumentItem(doc));
      setDocDrawerOpen(true);
    },
    [setEditingDoc, setDocDrawerOpen],
  );

  const handleBulkUploaded = useCallback(
    (result: BulkCreateResult) => {
      setBulkUploadOpen(false);
      const okN = result.created.length;
      const failN = result.failed.length;
      toast(
        `Uploaded ${okN} to Uncategorized` +
          (failN > 0 ? ` — ${failN} failed` : ""),
        failN > 0 ? "error" : "success",
      );
      setActiveTab("uncategorized");
      refetch();
    },
    [setBulkUploadOpen, toast, setActiveTab, refetch],
  );

  const handleBulkDeleted = useCallback(
    (result: BulkDeleteResult) => {
      setBulkOpen(false);
      toast(
        `Deleted ${result.documentCount} document(s)` +
          (result.storageErrors > 0
            ? ` — ${result.storageErrors} storage object(s) failed to remove`
            : ""),
        result.storageErrors > 0 ? "error" : "success",
      );
      refetch();
    },
    [setBulkOpen, toast, refetch],
  );

  return { handleEditUncategorized, handleBulkUploaded, handleBulkDeleted };
}
