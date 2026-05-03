"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OrderDetailActions({
  orderId,
  summaryUrl,
  hasList,
  lastDispatchedAtMs,
  rateLimitMs,
}: {
  orderId: string;
  summaryUrl: string | null;
  hasList: boolean;
  lastDispatchedAtMs: number | null;
  rateLimitMs: number;
}) {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [showDup, setShowDup] = useState(false);
  const [dupBusy, setDupBusy] = useState(false);
  const [dupError, setDupError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!lastDispatchedAtMs) return;
    const remainingMs = lastDispatchedAtMs + rateLimitMs - Date.now();
    if (remainingMs <= 0) return;
    const t = setTimeout(() => setNow(Date.now()), remainingMs + 100);
    return () => clearTimeout(t);
  }, [lastDispatchedAtMs, rateLimitMs, now]);

  const canResend =
    !lastDispatchedAtMs || now - lastDispatchedAtMs >= rateLimitMs;

  async function resend() {
    if (!confirm("Re-send this order to YLS? Use this if your YLS rep didn't receive proofs.")) {
      return;
    }
    setResending(true);
    setResendError(null);
    try {
      const res = await fetch(`/api/direct-mail/orders/${orderId}/resend`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Resend failed");
      }
      router.refresh();
    } catch (e) {
      setResendError(e instanceof Error ? e.message : "Resend failed");
    } finally {
      setResending(false);
    }
  }

  async function duplicate(includeList: boolean) {
    setDupBusy(true);
    setDupError(null);
    try {
      const res = await fetch(`/api/direct-mail/orders/${orderId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeList }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Duplicate failed");
      }
      const json = (await res.json()) as { orderId: string };
      router.push(`/dashboard/direct-mail/new?draftId=${json.orderId}`);
    } catch (e) {
      setDupError(e instanceof Error ? e.message : "Duplicate failed");
      setDupBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {summaryUrl && (
          <Button variant="primary" size="sm" asChild>
            <a href={summaryUrl} target="_blank" rel="noopener noreferrer">
              Download summary PDF
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={resend}
          disabled={resending || !canResend}
          loading={resending}
        >
          Resend to YLS
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDup(true)}
          disabled={dupBusy}
        >
          Duplicate
        </Button>
      </div>
      {!canResend && !resending && (
        <p className="text-xs text-slate-500">
          Wait at least 5 minutes between resends.
        </p>
      )}
      {resendError && (
        <p className="text-xs text-crimson-600">{resendError}</p>
      )}

      {showDup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">
              Duplicate this order?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This creates a new draft with the same artwork and spec.
              {hasList && " Want to copy the mailing list too, or upload a new one?"}
            </p>
            {dupError && <p className="text-xs text-crimson-600 mb-3">{dupError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDup(false)}
                disabled={dupBusy}
              >
                Cancel
              </Button>
              {hasList && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicate(false)}
                  disabled={dupBusy}
                >
                  Upload a new list
                </Button>
              )}
              <Button
                variant="crimson"
                size="sm"
                onClick={() => duplicate(true)}
                disabled={dupBusy}
                loading={dupBusy}
              >
                {hasList ? "Copy list too" : "Create draft"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
