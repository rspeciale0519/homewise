"use client";

import { useState } from "react";

interface CmaFormData {
  address: string;
  city: string;
  zip: string;
  beds: string;
  baths: string;
  sqft: string;
  propertyType: string;
}

interface CmaComp {
  address: string;
  city: string;
  soldPrice: number;
  beds: number;
  baths: number;
  sqft: number;
  dom: number;
  closeDate: string | null;
}

interface CmaResult {
  estimatedValue?: { low: number; mid: number; high: number };
  pricingRecommendation?: string;
  marketNarrative?: string;
  keyFindings?: string[];
  comps: CmaComp[];
  activeComps: Array<{ address: string; price: number; beds: number; baths: number; sqft: number; dom: number }>;
  subjectProperty: { address: string; city: string; zip: string; beds?: number; baths?: number; sqft?: number; propertyType?: string };
}

const PROPERTY_TYPES = ["Single Family", "Condo", "Townhouse", "Multi-Family", "Land"];

const INITIAL_FORM: CmaFormData = {
  address: "", city: "", zip: "", beds: "", baths: "", sqft: "", propertyType: "Single Family",
};

function fmt(n: number) {
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function CmaToolView() {
  const [form, setForm] = useState<CmaFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CmaResult | null>(null);

  const setField = (field: keyof CmaFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleGenerate = async () => {
    if (!form.address || !form.city || !form.zip) {
      setError("Address, city, and ZIP are required.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/cma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          city: form.city,
          zip: form.zip,
          beds: form.beds ? Number(form.beds) : undefined,
          baths: form.baths ? Number(form.baths) : undefined,
          sqft: form.sqft ? Number(form.sqft) : undefined,
          propertyType: form.propertyType || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Failed to generate CMA");
      }
      const data = await res.json() as CmaResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/ai/cma/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cma-${result.subjectProperty.address.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-navy-700 mb-5">Property Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Address *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="123 Main St"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Property Type</label>
            <select
              value={form.propertyType}
              onChange={(e) => setField("propertyType", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            >
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">City *</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              placeholder="Orlando"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">ZIP Code *</label>
            <input
              type="text"
              value={form.zip}
              onChange={(e) => setField("zip", e.target.value)}
              placeholder="32801"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Beds</label>
            <input
              type="number"
              min={1}
              value={form.beds}
              onChange={(e) => setField("beds", e.target.value)}
              placeholder="3"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Baths</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={form.baths}
              onChange={(e) => setField("baths", e.target.value)}
              placeholder="2"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Sq Ft</label>
            <input
              type="number"
              min={100}
              value={form.sqft}
              onChange={(e) => setField("sqft", e.target.value)}
              placeholder="1800"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-crimson-600 bg-crimson-50 border border-crimson-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="mt-5">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-navy-600 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? "Generating CMA…" : "Generate CMA"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-3">Analyzing comparables and generating report…</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Value range + download */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
              <div>
                <h2 className="font-semibold text-navy-700">Estimated Value Range</h2>
                <p className="text-xs text-slate-500 mt-0.5">{result.subjectProperty.address}, {result.subjectProperty.city}</p>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {pdfLoading ? "Generating PDF…" : "Download PDF"}
              </button>
            </div>

            {result.estimatedValue && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Conservative</p>
                  <p className="text-xl font-bold text-slate-700">{fmt(result.estimatedValue.low)}</p>
                </div>
                <div className="bg-navy-50 rounded-xl p-4 text-center border border-navy-100">
                  <p className="text-[10px] font-medium text-navy-500 uppercase tracking-wide mb-1">Recommended</p>
                  <p className="text-xl font-bold text-navy-700">{fmt(result.estimatedValue.mid)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Aggressive</p>
                  <p className="text-xl font-bold text-slate-700">{fmt(result.estimatedValue.high)}</p>
                </div>
              </div>
            )}

            {result.pricingRecommendation && (
              <div className="bg-crimson-50 border border-crimson-100 rounded-xl px-4 py-3">
                <p className="text-sm text-crimson-800">{result.pricingRecommendation}</p>
              </div>
            )}
          </div>

          {/* Comps table */}
          {result.comps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-navy-700">Comparable Sales ({result.comps.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Address</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Beds</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Baths</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Sq Ft</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Close Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Close Date</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">DOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comps.map((c, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-navy-700">{c.address}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{c.beds}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{c.baths}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{c.sqft?.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-navy-700">{fmt(c.soldPrice)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{fmtDate(c.closeDate)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{c.dom}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Market narrative */}
          {result.marketNarrative && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-navy-700 mb-3">Market Analysis</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{result.marketNarrative}</p>
            </div>
          )}

          {/* Key findings */}
          {result.keyFindings && result.keyFindings.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-navy-700 mb-3">Key Findings</h2>
              <ul className="space-y-2">
                {result.keyFindings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-crimson-100 flex items-center justify-center shrink-0">
                      <span className="block h-1.5 w-1.5 rounded-full bg-crimson-500" />
                    </span>
                    <span className="text-sm text-slate-600">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
