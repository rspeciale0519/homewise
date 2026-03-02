"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AgentInviteLinkProps {
  agentId: string;
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  inviteUsed: boolean;
  hasLinkedUser: boolean;
}

export function AgentInviteLink({
  agentId,
  inviteCode,
  inviteExpiresAt,
  inviteUsed,
  hasLinkedUser,
}: AgentInviteLinkProps) {
  const [code, setCode] = useState(inviteCode);
  const [expiresAt, setExpiresAt] = useState(inviteExpiresAt);
  const [used, setUsed] = useState(inviteUsed);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const isActive = !!code && !used && !isExpired && !hasLinkedUser;

  const registrationUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${code}`
    : null;

  const generateCode = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/invite`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.inviteCode);
        setExpiresAt(data.inviteExpiresAt);
        setUsed(data.inviteUsed);
      }
    } finally {
      setGenerating(false);
    }
  }, [agentId]);

  const copyLink = useCallback(async () => {
    if (!registrationUrl) return;
    await navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [registrationUrl]);

  if (hasLinkedUser) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-emerald-700">
            Account linked
          </p>
        </div>
        <p className="text-xs text-emerald-600 mt-1">
          This agent has registered and is connected to their user account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Registration Invite
        </p>
        {code && (
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-full",
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : used
                  ? "bg-slate-100 text-slate-500"
                  : "bg-amber-50 text-amber-700"
            )}
          >
            {used ? "Used" : isExpired ? "Expired" : "Active"}
          </span>
        )}
      </div>

      {isActive && registrationUrl ? (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={registrationUrl}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 truncate"
            />
            <button
              type="button"
              onClick={copyLink}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                copied
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-navy-50 text-navy-700 hover:bg-navy-100"
              )}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Expires{" "}
              {new Date(expiresAt!).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              onClick={generateCode}
              disabled={generating}
              className="text-[11px] text-slate-500 hover:text-navy-600 transition-colors"
            >
              {generating ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={generateCode}
          disabled={generating}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg
                className="h-3.5 w-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
              {code ? "Generate New Invite" : "Generate Invite Link"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
