"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { adminFetch, AdminFetchError } from "@/lib/admin-fetch";
import {
  CONFIRMATION_PHRASE,
  type BulkDeletePreview,
  type BulkDeleteResult,
} from "@/lib/documents/bulk-delete";
import type { DocumentSection } from "@/types/document-library";

interface CategoryOption {
  id: string;
  title: string;
  section: DocumentSection;
}

interface BulkDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleted: (result: BulkDeleteResult) => void;
  categories: CategoryOption[];
}

const SECTIONS: Array<{ key: DocumentSection; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
];

export function BulkDeleteDialog({
  open,
  onClose,
  onDeleted,
  categories,
}: BulkDeleteDialogProps) {
  const [mode, setMode] = useState<"all" | "scoped">("all");
  const [section, setSection] = useState<DocumentSection>("office");
  const [categoryId, setCategoryId] = useState<string>("");
  const [preview, setPreview] = useState<BulkDeletePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sectionCategories = useMemo(
    () => categories.filter((c) => c.section === section),
    [categories, section],
  );

  const query = useMemo(() => {
    if (mode === "all") return "scopeType=all";
    if (categoryId) {
      return `scopeType=category&section=${section}&categoryId=${encodeURIComponent(categoryId)}`;
    }
    return `scopeType=section&section=${section}`;
  }, [mode, section, categoryId]);

  useEffect(() => {
    if (open) {
      setMode("all");
      setSection("office");
      setCategoryId("");
      setTyped("");
      setMessage(null);
    }
  }, [open]);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setMessage(null);
    try {
      const data = await adminFetch<BulkDeletePreview>(
        `/api/admin/documents/bulk-delete?${query}`,
      );
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setMessage((err as Error).message);
    } finally {
      setLoadingPreview(false);
    }
  }, [query]);

  useEffect(() => {
    if (open) void loadPreview();
  }, [open, loadPreview]);

  const matches = typed === CONFIRMATION_PHRASE;
  const hasDocs = (preview?.documentCount ?? 0) > 0;
  const canConfirm = matches && hasDocs && !submitting && !loadingPreview;

  const handleConfirm = async () => {
    if (!canConfirm || !preview) return;
    setSubmitting(true);
    setMessage(null);
    const payload =
      mode === "all"
        ? { scopeType: "all" as const }
        : categoryId
          ? { scopeType: "category" as const, section, categoryId }
          : { scopeType: "section" as const, section };
    try {
      const result = await adminFetch<BulkDeleteResult>(
        "/api/admin/documents/bulk-delete",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            expectedDocumentCount: preview.documentCount,
            confirmationPhrase: typed,
          }),
        },
      );
      onDeleted(result);
    } catch (err) {
      if (err instanceof AdminFetchError && err.status === 409) {
        setTyped("");
        setMessage(
          "The library changed since you reviewed it. The numbers were refreshed — please re-check and confirm again.",
        );
        await loadPreview();
      } else {
        setMessage((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) onClose();
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-md w-full p-6 shadow-elevated z-50">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-crimson-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-crimson-600" />
            </div>
            <div className="flex-1">
              <AlertDialog.Title className="font-semibold text-navy-700 text-lg">
                Bulk delete documents
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-slate-600 mt-1">
                This permanently deletes documents from the library. It cannot
                be undone.
              </AlertDialog.Description>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="scope"
                checked={mode === "all"}
                onChange={() => setMode("all")}
              />
              Entire library
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="scope"
                checked={mode === "scoped"}
                onChange={() => setMode("scoped")}
              />
              Scoped
            </label>

            {mode === "scoped" && (
              <div className="pl-6 space-y-2">
                <select
                  value={section}
                  onChange={(e) => {
                    setSection(e.target.value as DocumentSection);
                    setCategoryId("");
                  }}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">All categories in section</option>
                  {sectionCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4 text-sm text-slate-600">
            {loadingPreview && <p>Calculating…</p>}
            {!loadingPreview && preview && (
              <>
                <p>
                  This permanently deletes{" "}
                  <span className="font-semibold text-crimson-700">
                    {preview.documentCount} documents
                  </span>
                  .
                </p>
                {preview.crossSectionCount > 0 && (
                  <p className="mt-1 text-crimson-700 font-medium">
                    {preview.crossSectionCount} of these also appear in other
                    sections and will be removed there too.
                  </p>
                )}
                <p className="mt-1">
                  This also destroys{" "}
                  <span className="font-semibold">
                    {preview.draftCount} agent drafts
                  </span>{" "}
                  (agents&apos; in-progress, filled-in documents),{" "}
                  {preview.favoriteCount} favorites, and {preview.recentCount}{" "}
                  recents.
                </p>
              </>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Type{" "}
              <span className="font-mono text-crimson-600 normal-case tracking-normal">
                {CONFIRMATION_PHRASE}
              </span>{" "}
              to confirm
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              className={`mt-2 font-mono text-sm h-10 px-3 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-600 ${
                matches ? "border-crimson-300 bg-crimson-50/30" : "border-slate-200"
              }`}
            />
          </div>

          {message && (
            <p className="mt-3 text-sm text-crimson-700">{message}</p>
          )}

          <div className="flex gap-2 pt-4 items-center">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {submitting && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 disabled:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
