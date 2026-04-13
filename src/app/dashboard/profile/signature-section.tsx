"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/documents/signature-pad";
import { SignatureUpload } from "@/components/documents/signature-upload";
import { SignatureLabelModal } from "@/components/documents/signature-label-modal";
import type { SavedSignature } from "@/types/document-viewer";

const MAX_SIGNATURES = 10;

interface SignatureSectionProps {
  initialSignatures: SavedSignature[];
}

type ViewMode = "list" | "draw" | "upload";

export function SignatureSection({ initialSignatures }: SignatureSectionProps) {
  const [signatures, setSignatures] = useState<SavedSignature[]>(initialSignatures);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [pendingDrawnImage, setPendingDrawnImage] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const atLimit = signatures.length >= MAX_SIGNATURES;

  const handleDrawnSave = useCallback((dataUrl: string) => {
    setPendingDrawnImage(dataUrl);
    setLabelInput("");
  }, []);

  const handleSaveWithLabel = useCallback(
    async (imageData: string, label: string, source: "drawn" | "uploaded") => {
      setStatus("saving");
      setError("");
      try {
        const res = await fetch("/api/documents/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, imageData, source }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to save signature");
        }
        const { signature } = await res.json();
        setSignatures((prev) => [...prev, {
          id: signature.id, label: signature.label,
          imageData: signature.imageData, source: signature.source,
        }]);
        setViewMode("list");
        setPendingDrawnImage(null);
        setLabelInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setStatus("idle");
      }
    }, []
  );

  const handleUploadSave = useCallback(
    (dataUrl: string, label: string) => { handleSaveWithLabel(dataUrl, label, "uploaded"); },
    [handleSaveWithLabel]
  );

  const handleDelete = useCallback(async (id: string) => {
    setStatus("deleting");
    setError("");
    try {
      const res = await fetch("/api/documents/signatures", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete signature");
      }
      setSignatures((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  }, []);

  const handleRename = useCallback(async (id: string) => {
    if (!editLabel.trim()) return;
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/documents/signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label: editLabel.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to rename signature");
      }
      setSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, label: editLabel.trim() } : s)));
      setEditingId(null);
      setEditLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  }, [editLabel]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-navy-700">My Signatures</h3>
          <p className="text-xs text-slate-500 mt-0.5">{signatures.length} of {MAX_SIGNATURES} signatures saved</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{error}</p>
        </div>
      )}

      {viewMode === "draw" && !pendingDrawnImage && (
        <SignaturePad onSave={handleDrawnSave} onCancel={() => setViewMode("list")} />
      )}

      {viewMode === "draw" && pendingDrawnImage && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center">
            <Image src={pendingDrawnImage} alt="Drawn signature preview" width={300} height={120} className="max-h-[100px] w-auto object-contain" unoptimized />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Signature Label <span className="text-crimson-500">*</span></label>
            <input type="text" value={labelInput} onChange={(e) => setLabelInput(e.target.value)} placeholder='e.g., "Full Signature", "Initials"' maxLength={50} className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setPendingDrawnImage(null); setViewMode("list"); }}>Cancel</Button>
            <Button size="sm" onClick={() => handleSaveWithLabel(pendingDrawnImage, labelInput, "drawn")} disabled={!labelInput.trim() || status === "saving"}>
              {status === "saving" ? "Saving..." : "Save Signature"}
            </Button>
          </div>
        </div>
      )}

      {viewMode === "upload" && (
        <SignatureUpload onSave={handleUploadSave} onCancel={() => setViewMode("list")} />
      )}

      {viewMode === "list" && (
        <>
          {signatures.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm text-slate-400">No signatures saved yet. Draw or upload one below.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex-shrink-0 w-[120px] h-[48px] rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                    <Image src={sig.imageData} alt={sig.label} width={120} height={48} className="w-full h-full object-contain" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === sig.id ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} maxLength={50} className="flex-1 h-8 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" onKeyDown={(e) => { if (e.key === "Enter") handleRename(sig.id); if (e.key === "Escape") setEditingId(null); }} autoFocus />
                        <Button variant="ghost" size="sm" onClick={() => handleRename(sig.id)} disabled={!editLabel.trim() || status === "saving"}>Save</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy-700 truncate">{sig.label}</p>
                        <span className="flex-shrink-0 text-[10px] uppercase tracking-wider font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{sig.source}</span>
                      </div>
                    )}
                  </div>
                  {editingId !== sig.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingId(sig.id); setEditLabel(sig.label); }} className="p-1.5 rounded-lg text-slate-400 hover:text-navy-600 hover:bg-slate-100 transition-colors" title="Rename">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                      </button>
                      <button onClick={() => setDeletingId(sig.id)} disabled={status === "deleting"} className="p-1.5 rounded-lg text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 transition-colors" title="Delete">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode("draw")} disabled={atLimit}>Draw Signature</Button>
            <Button variant="outline" size="sm" onClick={() => setViewMode("upload")} disabled={atLimit}>Upload PNG</Button>
            {atLimit && <span className="text-xs text-slate-400 ml-2">Maximum {MAX_SIGNATURES} signatures reached</span>}
          </div>
        </>
      )}

      {deletingId && (
        <SignatureLabelModal
          title="Delete Signature"
          description="Are you sure you want to delete this signature? This action is permanent and cannot be undone."
          onSave={() => {
            handleDelete(deletingId);
            setDeletingId(null);
          }}
          onCancel={() => setDeletingId(null)}
          saveText="Delete"
          cancelText="Cancel"
          showInput={false}
          variant="destructive"
        />
      )}
    </div>
  );
}
