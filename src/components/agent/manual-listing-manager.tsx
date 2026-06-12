"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ManualListingForm, type ManualListingFormData } from "./manual-listing-form";

type ManualListing = ManualListingFormData & {
  id: string;
  manualStatus: "pending" | "approved" | "archived";
  updatedAt: string;
};

const statusBadge: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
};

export function ManualListingManager() {
  const [listings, setListings] = useState<ManualListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ManualListing | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/manual-listings");
      const data = (await res.json()) as { listings?: ManualListing[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setListings(data.listings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (data: ManualListingFormData) => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editing === "new";
      const res = await fetch(
        isNew ? "/api/agent/manual-listings" : `/api/agent/manual-listings/${(editing as ManualListing).id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Save failed");
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    await fetch(`/api/agent/manual-listings/${id}`, { method: "DELETE" });
    await load();
  };

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-navy-700 mb-4">
          {editing === "new" ? "New Exclusive Listing" : "Edit Exclusive Listing"}
        </h2>
        <ManualListingForm
          initial={editing === "new" ? undefined : editing}
          saving={saving}
          error={error}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Off-market and pre-market properties shown publicly with an &ldquo;Exclusive&rdquo; badge after admin approval.
        </p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="px-4 py-2 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors"
        >
          + New Listing
        </button>
      </div>

      {error && !editing && <p className="text-sm text-crimson-600">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && listings.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-sm text-slate-500">
          No exclusive listings yet.
        </div>
      )}

      {listings.map((listing) => (
        <div key={listing.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-navy-700">{listing.address}, {listing.city}</span>
              <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusBadge[listing.manualStatus]}`}>
                {listing.manualStatus}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              ${listing.price.toLocaleString()} · {listing.beds} bd · {listing.bathsFull + listing.bathsHalf * 0.5} ba · {listing.sqft.toLocaleString()} sqft
            </p>
          </div>
          <div className="flex items-center gap-2">
            {listing.manualStatus === "approved" && (
              <Link href={`/properties/${listing.id}`} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-navy-700 border border-navy-200 hover:bg-navy-50 transition-colors">
                View
              </Link>
            )}
            <button
              type="button"
              onClick={() => setEditing(listing)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-navy-700 border border-navy-200 hover:bg-navy-50 transition-colors"
            >
              Edit
            </button>
            {listing.manualStatus !== "archived" && (
              <button
                type="button"
                onClick={() => archive(listing.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
