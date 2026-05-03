"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REQUIRED_LIST_COLUMNS } from "@/lib/direct-mail/constants";
import type { DraftState, ListUploadResult } from "@/lib/direct-mail/types";

export function StepList({
  draft,
  onUpload,
  onRemove,
  onChange,
  errors,
}: {
  draft: DraftState;
  onUpload: (file: File) => Promise<ListUploadResult>;
  onRemove: () => Promise<void>;
  onChange: (patch: Partial<DraftState>) => void;
  errors: Partial<Record<string, string>>;
}) {
  const [busy, setBusy] = useState(false);
  const [localResult, setLocalResult] = useState<ListUploadResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setLocalError(null);
    try {
      const result = await onUpload(file);
      setLocalResult(result);
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
      await onRemove();
      setLocalResult(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  const has = !!draft.listFileKey;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">Mailing list</h2>
        <p className="text-sm text-slate-500">
          Upload a CSV with these required columns:{" "}
          <span className="font-mono text-xs text-navy-700">
            {REQUIRED_LIST_COLUMNS.join(", ")}
          </span>
          . Common variants like <span className="font-mono text-xs">firstName</span>,{" "}
          <span className="font-mono text-xs">address</span>,{" "}
          <span className="font-mono text-xs">zipcode</span> are accepted.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy-700">
              CSV file <span className="text-crimson-600">*</span>
            </p>
            {has ? (
              <p className="text-xs text-emerald-700 mt-1 truncate">
                ✓ Uploaded · {draft.listRowCount.toLocaleString()} recipient
                {draft.listRowCount === 1 ? "" : "s"}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">No CSV uploaded yet.</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {has && (
              <Button variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
                Remove
              </Button>
            )}
            <Button variant={has ? "outline" : "crimson"} size="sm" disabled={busy} loading={busy}>
              <label htmlFor="list-csv" className="cursor-pointer">
                {has ? "Replace" : "Upload CSV"}
              </label>
            </Button>
          </div>
        </div>
        <input
          id="list-csv"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={handleFileChange}
          disabled={busy}
        />
        {localError && <p className="mt-2 text-xs text-crimson-600">{localError}</p>}
        {errors.listFileKey && !localError && (
          <p className="mt-2 text-xs text-crimson-600">{errors.listFileKey}</p>
        )}
      </div>

      {localResult && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
            First 5 rows preview
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white">
                <tr>
                  {Object.keys(localResult.previewRows[0] ?? {}).map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {localResult.previewRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    {Object.values(row).map((v, i) => (
                      <td key={i} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {localResult.warnings.length > 0 && (
            <ul className="px-4 py-2 border-t border-slate-100 space-y-1 text-xs text-amber-700">
              {localResult.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {has && (
        <div className="max-w-xs">
          <Input
            type="number"
            label="Quantity to mail"
            min={1}
            max={draft.listRowCount}
            value={draft.quantity || draft.listRowCount}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              onChange({ quantity: Number.isFinite(n) ? n : draft.listRowCount });
            }}
            hint={`Defaults to your list count (${draft.listRowCount.toLocaleString()}). Reduce if you only want to mail a subset.`}
            error={errors.quantity}
          />
        </div>
      )}
    </div>
  );
}
