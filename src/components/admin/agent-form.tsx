"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
};

export function AgentForm({ mode, agentId, initialData }: AgentFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AgentFormData>({ ...defaultData, ...initialData });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langInput, setLangInput] = useState("");
  const [desigInput, setDesigInput] = useState("");

  const updateField = <K extends keyof AgentFormData>(key: K, value: AgentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = (type: "languages" | "designations", value: string) => {
    const trimmed = value.trim();
    if (!trimmed || form[type].includes(trimmed)) return;
    updateField(type, [...form[type], trimmed]);
  };

  const removeTag = (type: "languages" | "designations", value: string) => {
    updateField(type, form[type].filter((t) => t !== value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = mode === "create" ? "/api/admin/agents" : `/api/admin/agents/${agentId}`;
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

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>First Name *</label>
          <input type="text" required value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last Name *</label>
          <input type="text" required value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input type="text" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Photo URL</label>
        <input type="url" value={form.photoUrl} onChange={(e) => updateField("photoUrl", e.target.value)} className={inputCls} placeholder="https://..." />
      </div>

      <div>
        <label className={labelCls}>Bio</label>
        <textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} rows={5} className={cn(inputCls, "resize-y")} />
      </div>

      <div>
        <label className={labelCls}>Languages</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.languages.map((lang) => (
            <span key={lang} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-navy-50 text-navy-700">
              {lang}
              <button type="button" onClick={() => removeTag("languages", lang)} className="text-navy-400 hover:text-navy-700">&times;</button>
            </span>
          ))}
        </div>
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

      <div>
        <label className={labelCls}>Designations</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.designations.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">
              {d}
              <button type="button" onClick={() => removeTag("designations", d)} className="text-amber-400 hover:text-amber-700">&times;</button>
            </span>
          ))}
        </div>
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
          {saving ? "Saving..." : mode === "create" ? "Create Agent" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
