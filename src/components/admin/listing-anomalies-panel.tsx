"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Anomaly = {
  id: string;
  kind: string;
  detail: string | null;
  createdAt: string;
  listing: { id: string; address: string; city: string; price: number; status: string };
};

const KIND_LABELS: Record<string, string> = {
  "price-drop": "Sharp price drop",
  "stale-dom": "Stale listing",
  "duplicate-address": "Possible duplicate",
  "no-photos": "Missing photos",
};

export function ListingAnomaliesPanel() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listing-anomalies");
      const data = (await res.json()) as { anomalies?: Anomaly[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setAnomalies(data.anomalies ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = async (id: string) => {
    await fetch("/api/admin/listing-anomalies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnomalies((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (error) return <p className="text-sm text-crimson-600">{error}</p>;
  if (anomalies.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-sm text-slate-500">
        No open anomalies. The scan runs daily.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly) => (
        <div key={anomaly.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap text-sm">
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 mr-2">
              {KIND_LABELS[anomaly.kind] ?? anomaly.kind}
            </span>
            <Link href={`/properties/${anomaly.listing.id}`} className="font-medium text-navy-700 hover:text-crimson-600 transition-colors">
              {anomaly.listing.address}, {anomaly.listing.city}
            </Link>
            {anomaly.detail && <span className="block text-xs text-slate-500 mt-0.5">{anomaly.detail}</span>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(anomaly.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
