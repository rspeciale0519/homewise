"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type QueueListing = {
  id: string;
  address: string;
  city: string;
  price: number;
  beds: number;
  sqft: number;
  manualStatus: "pending" | "approved" | "archived";
  listingAgentName: string | null;
  updatedAt: string;
};

const TABS = ["pending", "approved", "archived"] as const;

export function ManualListingsQueue() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [listings, setListings] = useState<QueueListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: (typeof TABS)[number]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/manual-listings?status=${status}`);
      const data = (await res.json()) as { listings?: QueueListing[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setListings(data.listings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const act = async (id: string, action: "approve" | "reject") => {
    await fetch("/api/admin/manual-listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load(tab);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-navy-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-crimson-600">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && listings.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-sm text-slate-500">
          Nothing {tab} right now.
        </div>
      )}

      {listings.map((listing) => (
        <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="font-medium text-navy-700">{listing.address}, {listing.city}</span>
            <p className="text-sm text-slate-500 mt-0.5">
              ${listing.price.toLocaleString()} · {listing.beds} bd · {listing.sqft.toLocaleString()} sqft
              {listing.listingAgentName ? ` · by ${listing.listingAgentName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {listing.manualStatus === "approved" && (
              <Link href={`/properties/${listing.id}`} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-navy-700 border border-navy-200 hover:bg-navy-50 transition-colors">
                View
              </Link>
            )}
            {listing.manualStatus !== "approved" && (
              <button
                type="button"
                onClick={() => act(listing.id, "approve")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Approve
              </button>
            )}
            {listing.manualStatus !== "archived" && (
              <button
                type="button"
                onClick={() => act(listing.id, "reject")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {listing.manualStatus === "approved" ? "Unpublish" : "Reject"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
