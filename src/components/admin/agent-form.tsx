"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PhotoUpload } from "@/components/admin/photo-upload";

interface AgentFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string;
  bio: string;
  languages: string[];
  designations: string[];
  active: boolean;
  emailSignature: string;
  emailTagline: string;
  brandColor: string;
}

interface AgentFormProps {
  mode: "create" | "edit";
  agentId?: string;
  initialData?: Partial<AgentFormData>;
}

const defaultData: AgentFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  photoUrl: "",
  bio: "",
  languages: [],
  designations: [],
  active: true,
  emailSignature: "",
  emailTagline: "",
  brandColor: "",
};

const BRAND_COLORS = [
  "#1e3a5f", "#0f766e", "#7c3aed", "#dc2626",
  "#ea580c", "#ca8a04", "#16a34a", "#2563eb",
];

const COMMON_LANGUAGES = ["English", "Spanish", "Portuguese", "French", "Mandarin", "Haitian Creole", "Vietnamese", "Arabic"];

const COMMON_DESIGNATIONS = ["CRS", "GRI", "ABR", "SRS", "SRES", "CIPS", "MRP", "PSA"];

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function generateSlug(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AgentForm({ mode, agentId, initialData }: AgentFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AgentFormData>({
    ...defaultData,
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langInput, setLangInput] = useState("");
  const [desigInput, setDesigInput] = useState("");

  const updateField = <K extends keyof AgentFormData>(
    key: K,
    value: AgentFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = (type: "languages" | "designations", value: string) => {
    const trimmed = value.trim();
    if (!trimmed || form[type].includes(trimmed)) return;
    updateField(type, [...form[type], trimmed]);
  };

  const removeTag = (type: "languages" | "designations", value: string) => {
    updateField(
      type,
      form[type].filter((t) => t !== value)
    );
  };

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateField("phone", formatPhone(e.target.value));
    },
    []
  );

  const onPhotoUploaded = useCallback((url: string) => {
    setForm((prev) => ({ ...prev, photoUrl: url }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url =
        mode === "create"
          ? "/api/admin/agents"
          : `/api/admin/agents/${agentId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push("/admin/agents");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to save agent.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const slug = generateSlug(form.firstName, form.lastName);
  const presetLanguages = COMMON_LANGUAGES.filter(
    (l) => !form.languages.includes(l)
  );
  const presetDesignations = COMMON_DESIGNATIONS.filter(
    (d) => !form.designations.includes(d)
  );

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300";
  const labelCls =
    "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit}>
      {/* Two-column layout: photo left, fields right */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-10">
        {/* Left column — Photo upload */}
        <div className="flex flex-col items-center lg:items-start lg:pt-2">
          <PhotoUpload
            currentUrl={form.photoUrl}
            firstName={form.firstName}
            lastName={form.lastName}
            onUploadComplete={onPhotoUploaded}
          />
        </div>

        {/* Right column — Form fields */}
        <div className="space-y-5">
          {/* Name row + slug preview */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name *</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Last Name *</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            {slug && (
              <p className="mt-1.5 text-xs text-slate-400">
                <span className="text-slate-500 font-medium">URL:</span>{" "}
                /agents/{slug}
              </p>
            )}
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={handlePhoneChange}
                className={inputCls}
                placeholder="(407) 555-0100"
                maxLength={14}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className={labelCls}>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              rows={5}
              className={cn(inputCls, "resize-y")}
            />
          </div>

          {/* Languages */}
          <div>
            <label className={labelCls}>Languages</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-navy-50 text-navy-700"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => removeTag("languages", lang)}
                    className="text-navy-400 hover:text-navy-700"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            {presetLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {presetLanguages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => addTag("languages", lang)}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-navy-300 hover:text-navy-600 hover:bg-navy-50/50 transition-colors"
                  >
                    + {lang}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("languages", langInput);
                  setLangInput("");
                }
              }}
              className={inputCls}
              placeholder="Type and press Enter to add"
            />
          </div>

          {/* Designations */}
          <div>
            <label className={labelCls}>Designations</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.designations.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeTag("designations", d)}
                    className="text-amber-400 hover:text-amber-700"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            {presetDesignations.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {presetDesignations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => addTag("designations", d)}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50/50 transition-colors"
                  >
                    + {d}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={desigInput}
              onChange={(e) => setDesigInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag("designations", desigInput);
                  setDesigInput("");
                }
              }}
              className={inputCls}
              placeholder="Type and press Enter to add"
            />
          </div>

          {/* Email Branding */}
          <div className="border-t border-slate-100 pt-5">
            <label className={labelCls}>Email Branding</label>
            <p className="text-xs text-slate-400 mb-3">Personalize automated emails sent on this agent&apos;s behalf</p>
            <div className="space-y-3"><div>
                <label className="text-xs text-slate-500">Email Tagline</label>
                <input
                  type="text"
                  value={form.emailTagline}
                  onChange={(e) => updateField("emailTagline", e.target.value)}
                  className={inputCls}
                  placeholder="Your Dream Home Awaits"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Email Signature</label>
                <textarea
                  value={form.emailSignature}
                  onChange={(e) => updateField("emailSignature", e.target.value)}
                  className={cn(inputCls, "resize-y")}
                  rows={3}
                  placeholder="Best regards,&#10;Jane Smith | Homewise FL&#10;(407) 555-0100"
                  maxLength={500}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Brand Color</label>
                <div className="flex items-center gap-2">
                  {BRAND_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateField("brandColor", c)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        form.brandColor === c ? "border-navy-600 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.brandColor || "#1e3a5f"}
                    onChange={(e) => updateField("brandColor", e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border-0 p-0"
                  />
                  {form.brandColor && (
                    <button type="button" onClick={() => updateField("brandColor", "")} className="text-xs text-slate-400 hover:text-slate-600">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm text-slate-600">Active in directory</span>
          </div>

          {error && <p className="text-sm text-crimson-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Create Agent"
                  : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
