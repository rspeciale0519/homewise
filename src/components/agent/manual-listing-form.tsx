"use client";

import { useState } from "react";
import Image from "next/image";

export type ManualListingFormData = {
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  bathsFull: number;
  bathsHalf: number;
  sqft: number;
  yearBuilt?: number | null;
  propertyType: string;
  description: string;
  photos: string[];
  status: "Active" | "Pending";
  hoaFee?: number | null;
  hoaFrequency?: string;
};

const EMPTY: ManualListingFormData = {
  address: "",
  city: "",
  state: "FL",
  zip: "",
  price: 0,
  beds: 0,
  bathsFull: 0,
  bathsHalf: 0,
  sqft: 0,
  yearBuilt: null,
  propertyType: "Residential",
  description: "",
  photos: [],
  status: "Active",
  hoaFee: null,
  hoaFrequency: "",
};

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200";
const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

export function ManualListingForm({
  initial,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ManualListingFormData>;
  saving: boolean;
  error: string | null;
  onSubmit: (data: ManualListingFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ManualListingFormData>({ ...EMPTY, ...initial });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const set = <K extends keyof ManualListingFormData>(key: K, value: ManualListingFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/agent/manual-listings/upload", { method: "POST", body });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
        urls.push(data.url);
      }
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...urls].slice(0, 30) }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Street Address *</label>
          <input required value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>City *</label>
          <input required value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>State</label>
            <input value={form.state} maxLength={2} onChange={(e) => set("state", e.target.value.toUpperCase())} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Zip *</label>
            <input required value={form.zip} onChange={(e) => set("zip", e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Price *</label>
          <input type="number" required min={1} value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Property Type</label>
          <select value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)} className={inputCls}>
            {["Residential", "Condominium", "Townhouse", "Land", "Commercial"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Beds</label>
            <input type="number" min={0} value={form.beds} onChange={(e) => set("beds", Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Full Baths</label>
            <input type="number" min={0} value={form.bathsFull} onChange={(e) => set("bathsFull", Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Half Baths</label>
            <input type="number" min={0} value={form.bathsHalf} onChange={(e) => set("bathsHalf", Number(e.target.value))} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sq Ft</label>
            <input type="number" min={0} value={form.sqft} onChange={(e) => set("sqft", Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Year Built</label>
            <input type="number" min={1800} max={2100} value={form.yearBuilt ?? ""} onChange={(e) => set("yearBuilt", e.target.value ? Number(e.target.value) : null)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value as "Active" | "Pending")} className={inputCls}>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>HOA Fee</label>
            <input type="number" min={0} value={form.hoaFee ?? ""} onChange={(e) => set("hoaFee", e.target.value ? Number(e.target.value) : null)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>HOA Frequency</label>
            <select value={form.hoaFrequency ?? ""} onChange={(e) => set("hoaFrequency", e.target.value)} className={inputCls}>
              <option value="">None</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annually">Annually</option>
            </select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={`${inputCls} resize-y`} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Photos</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => uploadPhotos(e.target.files)}
            className="block text-sm text-slate-500 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-navy-50 file:text-navy-700 file:text-sm file:font-semibold hover:file:bg-navy-100"
          />
          {uploading && <p className="mt-1 text-xs text-slate-400">Uploading…</p>}
          {uploadError && <p className="mt-1 text-xs text-crimson-600">{uploadError}</p>}
          {form.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.photos.map((url) => (
                <div key={url} className="relative h-16 w-20 rounded-lg overflow-hidden border border-slate-200">
                  <Image src={url} alt="Listing photo" fill sizes="80px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => set("photos", form.photos.filter((p) => p !== url))}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white text-[10px] leading-none"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-crimson-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-5 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Submit for Approval"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
