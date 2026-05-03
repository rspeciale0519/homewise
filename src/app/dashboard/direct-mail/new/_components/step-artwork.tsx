"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DraftState, ArtworkUploadResult } from "@/lib/direct-mail/types";

export function StepArtwork({
  draft,
  onUpload,
  onRemove,
  errors,
}: {
  draft: DraftState;
  onUpload: (slot: "front" | "back", file: File) => Promise<void>;
  onRemove: (slot: "front" | "back") => Promise<void>;
  errors: Partial<Record<string, string>>;
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">Artwork upload</h2>
        <p className="text-sm text-slate-500">
          Upload your print-ready front and back files (PDF, PNG, or JPG, up to 50 MB each).
        </p>
      </div>

      <ArtworkSlot
        slot="front"
        label="Front artwork"
        currentKey={draft.frontFileKey}
        required
        onUpload={onUpload}
        onRemove={onRemove}
        error={errors.frontFileKey}
      />

      <ArtworkSlot
        slot="back"
        label="Back artwork (optional for single-sided pieces)"
        currentKey={draft.backFileKey}
        required={false}
        onUpload={onUpload}
        onRemove={onRemove}
        error={errors.backFileKey}
      />

      <p className="text-xs text-slate-500">
        Note: artwork is your responsibility. Make sure your design meets your
        brokerage&apos;s compliance requirements (logo, license #, equal housing logo) before
        submitting. YLS prints exactly what you upload.
      </p>
    </div>
  );
}

function ArtworkSlot({
  slot,
  label,
  currentKey,
  required,
  onUpload,
  onRemove,
  error,
}: {
  slot: "front" | "back";
  label: string;
  currentKey: string | null;
  required: boolean;
  onUpload: (slot: "front" | "back", file: File) => Promise<void>;
  onRemove: (slot: "front" | "back") => Promise<void>;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [localResult, setLocalResult] = useState<ArtworkUploadResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setLocalError(null);
    try {
      await onUpload(slot, file);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    setLocalError(null);
    try {
      await onRemove(slot);
      setLocalResult(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  const inputId = `artwork-${slot}`;
  const has = !!currentKey;

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-700">
            {label}
            {required && <span className="text-crimson-600 ml-1">*</span>}
          </p>
          {has ? (
            <p className="text-xs text-emerald-700 mt-1 truncate">
              ✓ Uploaded ({currentKey})
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">No file uploaded yet.</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {has && (
            <Button variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
              Remove
            </Button>
          )}
          <Button variant={has ? "outline" : "crimson"} size="sm" disabled={busy} loading={busy}>
            <label htmlFor={inputId} className="cursor-pointer">
              {has ? "Replace" : "Upload"}
            </label>
          </Button>
        </div>
      </div>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="sr-only"
        onChange={handleFileChange}
        disabled={busy}
      />
      {localResult && localResult.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700">
          {localResult.warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}
      {localError && (
        <p className="mt-2 text-xs text-crimson-600">{localError}</p>
      )}
      {error && !localError && (
        <p className="mt-2 text-xs text-crimson-600">{error}</p>
      )}
    </div>
  );
}
