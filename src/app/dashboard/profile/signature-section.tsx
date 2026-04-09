"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/documents/signature-pad";

interface SignatureSectionProps {
  initialSignature: string | null;
}

export function SignatureSection({ initialSignature }: SignatureSectionProps) {
  const [signature, setSignature] = useState<string | null>(initialSignature);
  const [showPad, setShowPad] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [error, setError] = useState("");

  const handleSave = useCallback(async (dataUrl: string) => {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/documents/signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: dataUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save signature");
      }
      setSignature(dataUrl);
      setShowPad(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  }, []);

  const handleDelete = useCallback(async () => {
    setStatus("deleting");
    setError("");
    try {
      const res = await fetch("/api/documents/signatures", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete signature");
      }
      setSignature(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-navy-700">My Signature</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your saved signature will be available to place on any document.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{error}</p>
        </div>
      )}

      {showPad ? (
        <SignaturePad
          onSave={handleSave}
          onCancel={() => setShowPad(false)}
        />
      ) : signature ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center">
            <Image
              src={signature}
              alt="Your saved signature"
              width={300}
              height={120}
              className="max-h-[100px] w-auto object-contain"
              unoptimized
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPad(true)}
            >
              Re-draw
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={status === "deleting"}
              className="text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50"
            >
              {status === "deleting" ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPad(true)}
          className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-navy-300 hover:bg-navy-50/30 transition-all p-8 flex flex-col items-center gap-2"
        >
          <svg
            className="h-8 w-8 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
            />
          </svg>
          <span className="text-sm font-medium text-slate-500">
            Draw your signature
          </span>
        </button>
      )}
    </div>
  );
}
