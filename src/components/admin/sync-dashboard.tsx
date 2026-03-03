"use client";

import { useEffect, useState, useCallback } from "react";

interface SyncStatus {
  lastSyncAt: string | null;
  totalSynced: number;
  lastError: string | null;
  updatedAt: string;
}

export function SyncDashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sync");
      if (res.ok) {
        const data = (await res.json()) as SyncStatus;
        setStatus(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = (await res.json()) as { message?: string; error?: string };
      setMessage(data.message ?? data.error ?? "Sync triggered");
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl w-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard
          label="Last Sync"
          value={status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}
        />
        <StatusCard
          label="Total Listings Synced"
          value={String(status?.totalSynced ?? 0)}
        />
        <StatusCard
          label="Last Error"
          value={status?.lastError ?? "None"}
          error={!!status?.lastError}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-5 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? "Syncing..." : "Trigger Manual Sync"}
        </button>
        {message && (
          <p className="text-sm text-slate-600">{message}</p>
        )}
      </div>
    </div>
  );
}

function StatusCard({ label, value, error }: { label: string; value: string; error?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-1">
        {label}
      </p>
      <p className={`text-sm font-medium ${error ? "text-red-600" : "text-navy-700"} break-words`}>
        {value}
      </p>
    </div>
  );
}
