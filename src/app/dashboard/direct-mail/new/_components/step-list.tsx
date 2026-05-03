"use client";

import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_LIST_MIME,
  MAX_LIST_BYTES,
  MAX_LIST_FILES_PER_ORDER,
} from "@/lib/direct-mail/constants";
import type { DraftState, ListRow } from "@/lib/direct-mail/types";

const ACCEPT_ATTR = ".csv,text/csv,application/vnd.ms-excel,application/csv,text/plain";

export function StepList({
  draft,
  onAddFiles,
  onRename,
  onRemoveRow,
  onUploadAll,
  onColumnToggle,
  onBulkColumns,
  uploading,
  errors,
}: {
  draft: DraftState;
  onAddFiles: (files: File[]) => void;
  onRename: (listId: string, name: string) => void;
  onRemoveRow: (listId: string) => Promise<void>;
  onUploadAll: () => Promise<void>;
  onColumnToggle: (listId: string, columnName: string) => void;
  onBulkColumns: (listId: string, mode: "all" | "none") => void;
  uploading: boolean;
  errors: Partial<Record<string, string>>;
}) {
  const [rejection, setRejection] = useState<string | null>(null);
  const rows = draft.listRows;

  const counts = {
    total: rows.length,
    uploaded: rows.filter((r) => r.status === "uploaded").length,
    pending: rows.filter((r) => r.status === "pending" || r.status === "failed").length,
    uploading: rows.filter((r) => r.status === "uploading").length,
    finalizing: rows.filter((r) => r.status === "finalizing").length,
  };
  const remainingSlots = MAX_LIST_FILES_PER_ORDER - rows.length;

  const readyToUpload = rows.filter(
    (r) => (r.status === "pending" || r.status === "failed") && r.name.trim().length > 0,
  ).length;
  const namelessPending = rows.some(
    (r) => (r.status === "pending" || r.status === "failed") && r.name.trim().length === 0,
  );

  function ingest(files: File[]) {
    setRejection(null);
    const accepted: File[] = [];
    for (const f of files) {
      const isAcceptedMime =
        ACCEPTED_LIST_MIME.includes(f.type as (typeof ACCEPTED_LIST_MIME)[number]) ||
        f.type === "" ||
        f.name.toLowerCase().endsWith(".csv");
      if (!isAcceptedMime) {
        setRejection(`"${f.name}" is not a CSV file.`);
        continue;
      }
      if (f.size > MAX_LIST_BYTES) {
        setRejection(`"${f.name}" is larger than ${Math.round(MAX_LIST_BYTES / 1024 / 1024)} MB.`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > remainingSlots) {
      setRejection(
        `You can add at most ${remainingSlots} more list${remainingSlots === 1 ? "" : "s"} to this order. Some files were skipped.`,
      );
    }
    onAddFiles(accepted.slice(0, remainingSlots));
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">Mailing list</h2>
        <p className="text-sm text-slate-500">
          Upload one or more CSV files containing the recipients for this campaign. After
          each upload, you can de-select any columns you don&apos;t want sent to YLS — only
          the kept columns will be included in the order.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          <span className="font-semibold">Tip:</span> YLS typically needs name and address
          columns to mail to recipients (first/last name, street, city, state, ZIP).
        </p>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row, idx) => (
            <ListRowCard
              key={row.id}
              row={row}
              index={idx}
              onRename={onRename}
              onRemoveRow={onRemoveRow}
              onColumnToggle={onColumnToggle}
              onBulkColumns={onBulkColumns}
              error={errors[`listFiles.${idx}`]}
            />
          ))}
        </ul>
      )}

      <DropZone
        onFiles={ingest}
        disabled={remainingSlots <= 0 || uploading}
        compact={rows.length > 0}
      />

      {rejection && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {rejection}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          {counts.total} staged · {counts.uploaded} uploaded ·{" "}
          {Math.max(0, remainingSlots)} more allowed
        </p>
        <Button
          type="button"
          variant="crimson"
          size="md"
          onClick={() => void onUploadAll()}
          disabled={readyToUpload === 0 || uploading || namelessPending}
          loading={uploading}
        >
          {uploading
            ? counts.finalizing > 0 && counts.uploading === 0
              ? `Finalizing ${counts.finalizing} list${counts.finalizing === 1 ? "" : "s"}…`
              : `Uploading ${counts.uploading} list${counts.uploading === 1 ? "" : "s"}…`
            : readyToUpload > 0
              ? `Upload all files (${readyToUpload})`
              : "Upload all files"}
        </Button>
      </div>

      {namelessPending && readyToUpload === 0 && counts.pending > 0 && (
        <p className="text-xs text-amber-700">
          Add a description to each list before uploading.
        </p>
      )}

      {errors.listFiles && (
        <p className="text-xs text-crimson-600">{errors.listFiles}</p>
      )}
    </div>
  );
}

function DropZone({
  onFiles,
  disabled,
  compact,
}: {
  onFiles: (files: File[]) => void;
  disabled: boolean;
  compact: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    setIsOver(true);
  }
  function onDragLeave() {
    setIsOver(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-disabled={disabled}
      className={cn(
        "rounded-xl border-2 border-dashed transition-all cursor-pointer text-center",
        compact ? "py-5 px-4" : "py-10 px-6",
        isOver
          ? "border-crimson-500 bg-crimson-50/40"
          : "border-slate-300 bg-slate-50/40 hover:border-crimson-300 hover:bg-slate-50/80",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex flex-col items-center gap-1.5">
        <svg
          className={cn(
            compact ? "h-6 w-6" : "h-9 w-9",
            isOver ? "text-crimson-600" : "text-slate-400",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className={cn("font-semibold text-navy-700", compact ? "text-sm" : "text-base")}>
          {disabled
            ? `Maximum ${MAX_LIST_FILES_PER_ORDER} lists reached`
            : "Drop CSV files here or click to browse"}
        </p>
        {!compact && !disabled && (
          <p className="text-xs text-slate-500">
            CSV — up to {Math.round(MAX_LIST_BYTES / 1024 / 1024)} MB each
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
        disabled={disabled}
      />
    </div>
  );
}

function ListRowCard({
  row,
  index,
  onRename,
  onRemoveRow,
  onColumnToggle,
  onBulkColumns,
  error,
}: {
  row: ListRow;
  index: number;
  onRename: (listId: string, name: string) => void;
  onRemoveRow: (listId: string) => Promise<void>;
  onColumnToggle: (listId: string, columnName: string) => void;
  onBulkColumns: (listId: string, mode: "all" | "none") => void;
  error?: string;
}) {
  const meta = row.upload ?? row.localFile;
  const labelId = `list-desc-${row.id}`;
  const sizeText = meta ? formatBytes(meta.byteSize) : "";
  const fileNameText = meta?.fileName ?? "";

  return (
    <li
      className={cn(
        "relative rounded-xl border p-4",
        row.status === "uploaded" && "border-emerald-200 bg-emerald-50/30",
        row.status === "uploading" && "border-navy-200 bg-navy-50/30",
        row.status === "finalizing" && "border-amber-200 bg-amber-50/30",
        row.status === "failed" && "border-crimson-200 bg-crimson-50/30",
        row.status === "pending" && "border-slate-200 bg-slate-50/40",
      )}
    >
      <div className="flex items-start gap-3 mb-2">
        <CsvIcon />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-700 truncate" title={fileNameText}>
            {fileNameText || `List ${index + 1}`}
          </p>
          <p className="text-xs text-slate-500">
            {sizeText}
            {row.upload && (
              <span> · {row.upload.rowCount.toLocaleString()} recipients</span>
            )}
          </p>
        </div>
        <StatusBadge row={row} />
        <button
          type="button"
          onClick={() => void onRemoveRow(row.id)}
          aria-label={`Remove ${fileNameText || `list ${index + 1}`}`}
          disabled={row.status === "uploading" || row.status === "finalizing"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-crimson-600 disabled:opacity-30"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <Input
        id={labelId}
        label="Description"
        placeholder="e.g., Lake Mary farm Q2, Recently sold prospects"
        value={row.name}
        onChange={(e) => onRename(row.id, e.target.value)}
        disabled={row.status === "uploading" || row.status === "finalizing"}
      />

      {row.status === "uploading" && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-navy-600 transition-all duration-150"
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 tabular-nums">{row.progress}%</p>
        </div>
      )}

      {row.status === "finalizing" && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-800">
          <span
            aria-hidden
            className="h-3 w-3 rounded-full border-2 border-amber-300 border-t-amber-700 animate-spin"
          />
          <span>Parsing CSV (columns &amp; rows)…</span>
        </div>
      )}

      {row.status === "uploaded" && row.upload && (
        <ColumnPreview
          row={row}
          onColumnToggle={onColumnToggle}
          onBulkColumns={onBulkColumns}
        />
      )}

      {row.status === "uploaded" && row.upload && row.upload.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700">
          {row.upload.warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}

      {row.status === "failed" && row.lastError && (
        <p className="mt-3 text-xs text-crimson-700">
          ✗ {row.lastError} — clicking <strong>Upload all files</strong> will retry.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-crimson-600">{error}</p>}
    </li>
  );
}

function ColumnPreview({
  row,
  onColumnToggle,
  onBulkColumns,
}: {
  row: ListRow;
  onColumnToggle: (listId: string, columnName: string) => void;
  onBulkColumns: (listId: string, mode: "all" | "none") => void;
}) {
  const upload = row.upload!;
  const excludedSet = new Set(row.excludedColumns);
  const keptCount = upload.columns.length - row.excludedColumns.length;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Preview &amp; column selection
        </p>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => onBulkColumns(row.id, "all")}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Keep all
          </button>
          <button
            type="button"
            onClick={() => onBulkColumns(row.id, "none")}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Drop all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {upload.columns.map((col) => {
                const excluded = excludedSet.has(col);
                const fill = upload.fillPercent[col] ?? 0;
                return (
                  <th
                    key={col}
                    className={cn(
                      "border-b border-slate-200 px-3 py-2 text-left align-top whitespace-nowrap font-medium min-w-[110px]",
                      excluded ? "bg-slate-100/80" : "",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onColumnToggle(row.id, col)}
                      aria-pressed={!excluded}
                      title={excluded ? "Click to include this column" : "Click to drop this column"}
                      className={cn(
                        "group inline-flex items-center gap-1.5 text-left",
                        excluded
                          ? "text-slate-400 line-through"
                          : "text-navy-700 hover:text-crimson-700",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold border",
                          excluded
                            ? "border-slate-300 bg-white text-slate-400"
                            : "border-emerald-300 bg-emerald-50 text-emerald-700 group-hover:border-crimson-300 group-hover:bg-crimson-50 group-hover:text-crimson-700",
                        )}
                      >
                        {excluded ? "+" : "×"}
                      </span>
                      <span>{col}</span>
                    </button>
                    <p
                      className={cn(
                        "mt-0.5 text-[10px] font-normal",
                        excluded ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      {fill}% filled
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {upload.previewRows.map((rec, i) => (
              <tr key={i} className="border-t border-slate-100">
                {upload.columns.map((col) => {
                  const excluded = excludedSet.has(col);
                  return (
                    <td
                      key={col}
                      className={cn(
                        "px-3 py-2 align-top whitespace-nowrap",
                        excluded
                          ? "text-slate-300 line-through bg-slate-50/40"
                          : "text-slate-700",
                      )}
                    >
                      {rec[col] ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className={cn(
          "mt-2 text-[11px]",
          keptCount === 0 ? "text-crimson-700" : "text-slate-500",
        )}
      >
        {keptCount} of {upload.columns.length} columns will be sent
        {row.excludedColumns.length > 0 && ` · ${row.excludedColumns.length} excluded`}
        {keptCount === 0 && " · keep at least one column to submit"}
      </p>
    </div>
  );
}

function StatusBadge({ row }: { row: ListRow }) {
  const map: Record<ListRow["status"], { label: string; classes: string }> = {
    pending: {
      label: "Pending upload",
      classes: "bg-slate-100 text-slate-600 border-slate-200",
    },
    uploading: {
      label: row.progress > 0 ? `Uploading ${row.progress}%` : "Uploading…",
      classes: "bg-navy-50 text-navy-700 border-navy-200",
    },
    finalizing: {
      label: "Finalizing…",
      classes: "bg-amber-50 text-amber-800 border-amber-200",
    },
    uploaded: {
      label: "Uploaded",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    failed: {
      label: "Failed",
      classes: "bg-crimson-50 text-crimson-700 border-crimson-200",
    },
  };
  const cfg = map[row.status];
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        cfg.classes,
      )}
    >
      {cfg.label}
    </span>
  );
}

function CsvIcon() {
  return (
    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-md bg-white border border-slate-200 text-[9px] font-bold tracking-wider text-slate-600">
      CSV
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
