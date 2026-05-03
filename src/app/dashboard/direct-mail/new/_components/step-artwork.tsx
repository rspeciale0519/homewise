"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_ARTWORK_FILES_PER_ORDER } from "@/lib/direct-mail/constants";
import type { ArtworkRow, DraftState } from "@/lib/direct-mail/types";

export function StepArtwork({
  draft,
  onUpload,
  onRemove,
  onRename,
  onAddRow,
  onRemoveRow,
  errors,
}: {
  draft: DraftState;
  onUpload: (artworkId: string, file: File) => Promise<ArtworkRow>;
  onRemove: (artworkId: string) => Promise<void>;
  onRename: (artworkId: string, name: string) => void;
  onAddRow: () => void;
  onRemoveRow: (artworkId: string) => void;
  errors: Partial<Record<string, string>>;
}) {
  const rows = draft.artworkRows;
  const canAdd = rows.length < MAX_ARTWORK_FILES_PER_ORDER;
  const canRemoveAny = rows.length > 1;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">Artwork upload</h2>
        <p className="text-sm text-slate-500">
          Add a description for each piece of artwork and upload the file. Accepted formats:
          PDF, PNG, JPG, or Word (.doc / .docx). Max 50 MB each.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <ArtworkRowCard
            key={row.id}
            row={row}
            index={idx}
            canRemove={canRemoveAny}
            onUpload={onUpload}
            onRemove={onRemove}
            onRename={onRename}
            onRemoveRow={onRemoveRow}
            error={errors[`artworkFiles.${idx}`]}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAddRow}
          disabled={!canAdd}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-crimson-300 hover:text-crimson-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span aria-hidden className="text-base leading-none">+</span>
          Add another file
        </button>
        <p className="text-xs text-slate-400">
          {countCompleted(rows)} of {rows.length} ready ·{" "}
          {MAX_ARTWORK_FILES_PER_ORDER - rows.length} more allowed
        </p>
      </div>

      {errors.artworkFiles && (
        <p className="text-xs text-crimson-600">{errors.artworkFiles}</p>
      )}

      <p className="text-xs text-slate-500">
        Note: artwork is your responsibility. Make sure each file meets your brokerage&apos;s
        compliance requirements (logo, license #, equal-housing logo) before submitting.
        YLS prints exactly what you upload.
      </p>
    </div>
  );
}

function countCompleted(rows: ArtworkRow[]): number {
  return rows.filter((r) => r.upload && r.name.trim().length > 0).length;
}

function ArtworkRowCard({
  row,
  index,
  canRemove,
  onUpload,
  onRemove,
  onRename,
  onRemoveRow,
  error,
}: {
  row: ArtworkRow;
  index: number;
  canRemove: boolean;
  onUpload: (artworkId: string, file: File) => Promise<ArtworkRow>;
  onRemove: (artworkId: string) => Promise<void>;
  onRename: (artworkId: string, name: string) => void;
  onRemoveRow: (artworkId: string) => void;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputId = `artwork-file-${row.id}`;
  const has = !!row.upload;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setLocalError(null);
    try {
      await onUpload(row.id, file);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleRemoveFile() {
    setBusy(true);
    setLocalError(null);
    try {
      await onRemove(row.id);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`relative rounded-xl border p-4 ${
        has ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-slate-50/30"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <Input
            label={`File ${index + 1} description`}
            placeholder="e.g., Postcard front, Yellow letter, Envelope"
            value={row.name}
            onChange={(e) => onRename(row.id, e.target.value)}
            hint={
              has
                ? `${row.upload!.fileName} · ${formatBytes(row.upload!.byteSize)}`
                : "Required if you upload a file."
            }
          />
        </div>

        <div className="flex shrink-0 items-end gap-2">
          {has && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={busy}
            >
              Remove file
            </Button>
          )}
          <Button
            type="button"
            variant={has ? "outline" : "crimson"}
            size="sm"
            disabled={busy}
            loading={busy}
            asChild
          >
            <label htmlFor={inputId} className="cursor-pointer">
              {has ? "Replace" : "Upload"}
            </label>
          </Button>
        </div>
      </div>

      {row.upload && row.upload.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700">
          {row.upload.warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}

      {(localError || error) && (
        <p className="mt-2 text-xs text-crimson-600">{localError ?? error}</p>
      )}

      <input
        id={inputId}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={handleFileChange}
        disabled={busy}
      />

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemoveRow(row.id)}
          aria-label={`Remove file row ${index + 1}`}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-crimson-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
