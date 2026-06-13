"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

interface Comp {
  id: string;
  address: string;
  city: string;
  zip: string;
  price: number;
  closePrice: number | null;
  closeDate: string | null;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number | null;
  daysOnMarket: number;
  listingOfficeName: string | null;
  listingId: string | null;
}

export function VowCompsSearch() {
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [comps, setComps] = useState<Comp[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const search = async () => {
    if (!city.trim() && !zip.trim()) {
      setMessage("Enter a city or ZIP code.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (city.trim()) params.set("city", city.trim());
      if (zip.trim()) params.set("zip", zip.trim());
      const res = await fetch(`/api/vow/comps?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Search failed.");
        return;
      }
      setComps(data.comps);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Network error.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ✓ You are a registered VOW consumer. Recently sold comparables below are
        provided under the Stellar MLS VOW program and are not shown on the public site.
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-4">
          Recently Sold Comparables
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (e.g. Orlando)"
            className="h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP (e.g. 34293)"
            className="h-11 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <button
            type="button"
            onClick={search}
            disabled={status === "loading"}
            className="h-11 px-5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Searching…" : "Search Sold"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-crimson-600">{message}</p>}
      </div>

      {comps && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-sm text-slate-500">
            {comps.length} sold {comps.length === 1 ? "comparable" : "comparables"}
          </div>
          {comps.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No sold comparables found for that area.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-2 font-medium">Address</th>
                    <th className="px-4 py-2 font-medium">Sold Price</th>
                    <th className="px-4 py-2 font-medium">List Price</th>
                    <th className="px-4 py-2 font-medium">Closed</th>
                    <th className="px-4 py-2 font-medium">Bd/Ba</th>
                    <th className="px-4 py-2 font-medium">Sq Ft</th>
                    <th className="px-4 py-2 font-medium">DOM</th>
                  </tr>
                </thead>
                <tbody>
                  {comps.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2 text-navy-700">
                        {c.address}, {c.city} {c.zip}
                        {c.listingOfficeName && (
                          <span className="block text-[11px] text-slate-400">
                            Courtesy of {c.listingOfficeName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-semibold text-emerald-700">
                        {formatPrice(c.closePrice ?? c.price)}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{formatPrice(c.price)}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {c.closeDate ? new Date(c.closeDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{c.beds}/{c.baths}</td>
                      <td className="px-4 py-2 text-slate-500">{c.sqft.toLocaleString()}</td>
                      <td className="px-4 py-2 text-slate-500">{c.daysOnMarket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400">
            Sold data courtesy of Stellar MLS as distributed by MLS GRID. Provided
            under the VOW program for your personal, non-commercial use only.
          </div>
        </div>
      )}
    </div>
  );
}
