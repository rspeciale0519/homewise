"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AgentApplicationReviewProps {
  id: string;
  status: string;
  inviteUrl?: string | null;
}

export function AgentApplicationReview({ id, status, inviteUrl }: AgentApplicationReviewProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const act = async (action: "approve" | "reject") => {
    setError("");
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/agent-applications/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Action failed");

      if (action === "approve" && data?.inviteUrl) {
        setResultLink(data.inviteUrl);
        if (data.emailWarning) setWarning(data.emailWarning);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  if (status !== "pending") {
    return (
      <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 space-y-3">
        <p className="text-sm text-slate-600">
          This application has been <strong className="capitalize text-navy-700">{status}</strong>.
        </p>
        {inviteUrl && (
          <InviteLink url={inviteUrl} />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-navy-700">Review Decision</h2>

      {resultLink ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="text-sm text-emerald-700">Approved — agent profile created and invite sent.</p>
          </div>
          {warning && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-700">{warning}</p>
            </div>
          )}
          <InviteLink url={resultLink} />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="review-notes" className="block text-sm font-medium text-navy-700 mb-1.5">
              Notes <span className="text-slate-400 text-xs font-normal">(optional — included in the applicant&apos;s email)</span>
            </label>
            <textarea
              id="review-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-navy-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-shadow resize-none"
              placeholder="Optional notes for the applicant."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-crimson-50 border border-crimson-200 px-4 py-3">
              <p className="text-sm text-crimson-700">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => act("approve")}
              disabled={busy !== null}
              className={cn(
                "flex-1 h-11 rounded-xl text-white font-semibold text-sm transition-colors shadow-sm",
                "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {busy === "approve" ? "Approving..." : "Approve & Invite"}
            </button>
            <button
              onClick={() => act("reject")}
              disabled={busy !== null}
              className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {busy === "reject" ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-mono"
      />
      <button
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="px-3 py-2 rounded-lg text-xs font-medium bg-navy-600 text-white hover:bg-navy-700 transition-colors shrink-0"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
