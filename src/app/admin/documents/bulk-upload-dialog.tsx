"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { UploadCloud, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import {
  MAX_BATCH,
  UPLOAD_CONCURRENCY,
  ALLOWED_EXTENSIONS,
  nameFromFilename,
  validateFile,
  runWithConcurrency,
  xhrPut,
  type BulkCreateResult,
  type BulkUploadItem,
} from "@/lib/documents/bulk-upload";

type RowStatus =
  | { kind: "queued" }
  | { kind: "invalid"; reason: string }
  | { kind: "uploading"; pct: number }
  | { kind: "done" }
  | { kind: "error"; reason: string };

interface Row {
  id: string;
  file: File;
  name: string;
  status: RowStatus;
}

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (result: BulkCreateResult) => void;
}

let rowSeq = 0;

export function BulkUploadDialog({
  open,
  onClose,
  onUploaded,
}: BulkUploadDialogProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset queue when dialog opens
      setRows([]);
      setMessage(null);
      setSubmitting(false);
      setDragOver(false);
    }
  }, [open]);

  const addFiles = useCallback((files: File[]) => {
    setMessage(null);
    setRows((prev) => {
      const space = MAX_BATCH - prev.length;
      const slice = files.slice(0, Math.max(0, space));
      if (files.length > slice.length) {
        setMessage(`Limit is ${MAX_BATCH} files per batch.`);
      }
      const next = slice.map<Row>((file) => {
        const v = validateFile({
          name: file.name,
          type: file.type,
          size: file.size,
        });
        return {
          id: `r${rowSeq++}`,
          file,
          name: nameFromFilename(file.name),
          status: v.ok
            ? { kind: "queued" }
            : { kind: "invalid", reason: v.reason },
        };
      });
      return [...prev, ...next];
    });
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const uploadable = useMemo(
    () =>
      rows.filter(
        (r) => r.status.kind === "queued" || r.status.kind === "error",
      ),
    [rows],
  );
  const canUpload = uploadable.length > 0 && !submitting;
  const hasErrors = uploadable.some((r) => r.status.kind === "error");

  const runUpload = useCallback(async () => {
    if (!canUpload) return;
    setSubmitting(true);
    setMessage(null);
    const targets = rows.filter(
      (r) => r.status.kind === "queued" || r.status.kind === "error",
    );
    const ok = await runWithConcurrency(
      targets,
      UPLOAD_CONCURRENCY,
      async (row): Promise<BulkUploadItem | null> => {
        try {
          setRow(row.id, { status: { kind: "uploading", pct: 0 } });
          const signed = await adminFetch<{
            uploadUrl: string;
            storageKey: string;
            storageProvider: "supabase";
          }>("/api/admin/documents/upload", {
            method: "POST",
            body: JSON.stringify({
              filename: row.file.name,
              contentType: row.file.type,
            }),
          });
          await xhrPut(signed.uploadUrl, row.file, {
            onProgress: (pct) =>
              setRow(row.id, { status: { kind: "uploading", pct } }),
          });
          setRow(row.id, { status: { kind: "done" } });
          return {
            name: row.name.trim() || nameFromFilename(row.file.name),
            storageKey: signed.storageKey,
            storageProvider: "supabase",
            mimeType: row.file.type || null,
            sizeBytes: row.file.size,
          };
        } catch (e) {
          setRow(row.id, {
            status: { kind: "error", reason: (e as Error).message },
          });
          return null;
        }
      },
    );
    const items = ok.filter((x): x is BulkUploadItem => x !== null);
    if (items.length > 0) {
      try {
        const result = await adminFetch<BulkCreateResult>(
          "/api/admin/documents/bulk-create",
          { method: "POST", body: JSON.stringify({ items }) },
        );
        onUploaded(result);
        return;
      } catch (e) {
        setMessage((e as Error).message);
      }
    } else {
      setMessage("No files uploaded.");
    }
    setSubmitting(false);
  }, [canUpload, rows, onUploaded]);

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) onClose();
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-lg w-full p-6 shadow-elevated z-50">
          <AlertDialog.Title className="font-semibold text-navy-700 text-lg">
            Bulk upload documents
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-slate-600 mt-1">
            Files upload to <strong>Uncategorized</strong> and stay unpublished
            until you categorize and publish them.
          </AlertDialog.Description>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              setDragOver(false);
              onDrop(e);
            }}
            className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragOver ? "border-navy-500 bg-navy-50/40" : "border-slate-200"
            }`}
          >
            <UploadCloud className="h-6 w-6 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 mt-2">
              Drag &amp; drop files here, or{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-navy-600 font-semibold underline"
              >
                browse
              </button>
            </p>
            <input
              ref={inputRef}
              data-testid="bulk-upload-input"
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={onInputChange}
              className="hidden"
            />
          </div>

          {rows.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-2">
                  <input
                    value={r.name}
                    disabled={
                      r.status.kind === "invalid" ||
                      r.status.kind === "uploading" ||
                      r.status.kind === "done" ||
                      submitting
                    }
                    onChange={(e) => setRow(r.id, { name: e.target.value })}
                    className="flex-1 min-w-0 h-8 px-2 text-sm border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <span className="text-xs text-slate-400 w-28 text-right shrink-0">
                    {r.status.kind === "queued" && "Queued"}
                    {r.status.kind === "invalid" && r.status.reason}
                    {r.status.kind === "uploading" && `${r.status.pct}%`}
                    {r.status.kind === "done" && "Done"}
                    {r.status.kind === "error" && r.status.reason}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${r.file.name}`}
                    disabled={r.status.kind === "uploading"}
                    onClick={() => removeRow(r.id)}
                    className="h-7 w-7 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 rounded disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {message && (
            <p className="mt-3 text-sm text-crimson-700">{message}</p>
          )}

          <div className="flex gap-2 pt-4 items-center">
            <button
              onClick={runUpload}
              disabled={!canUpload}
              className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {submitting && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {hasErrors ? "Retry failed" : submitting ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={() => handleOpenChange(false)}
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
