"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EntitlementConfig {
  id: string;
  featureKey: string;
  featureName: string;
  requiredProduct: string | null;
  freeLimit: number | null;
  description: string | null;
  isActive: boolean;
}

type FormMode = "closed" | "create" | "edit";

interface FeatureFormData {
  featureKey: string;
  featureName: string;
  requiredProduct: string;
  freeLimit: string;
  description: string;
  isActive: boolean;
}

const emptyForm: FeatureFormData = {
  featureKey: "",
  featureName: "",
  requiredProduct: "",
  freeLimit: "",
  description: "",
  isActive: true,
};

export function FeatureManagement() {
  const [features, setFeatures] = useState<EntitlementConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FeatureFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/features");
      if (res.ok) {
        const data = await res.json();
        setFeatures(data.features);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setFormMode("create");
    setError(null);
  };

  const openEdit = (feature: EntitlementConfig) => {
    setForm({
      featureKey: feature.featureKey,
      featureName: feature.featureName,
      requiredProduct: feature.requiredProduct ?? "",
      freeLimit: feature.freeLimit !== null ? String(feature.freeLimit) : "",
      description: feature.description ?? "",
      isActive: feature.isActive,
    });
    setEditId(feature.id);
    setFormMode("edit");
    setError(null);
  };

  const handleToggle = async (feature: EntitlementConfig) => {
    const res = await fetch(`/api/admin/billing/features/${feature.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !feature.isActive }),
    });

    if (res.ok) {
      fetchFeatures();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      featureKey: form.featureKey,
      featureName: form.featureName,
      requiredProduct: form.requiredProduct || null,
      freeLimit: form.freeLimit ? parseInt(form.freeLimit, 10) : null,
      description: form.description || undefined,
      isActive: form.isActive,
    };

    try {
      const url = formMode === "create"
        ? "/api/admin/billing/features"
        : `/api/admin/billing/features/${editId}`;
      const method = formMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save feature");
        return;
      }

      setFormMode("closed");
      fetchFeatures();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof FeatureFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{features.length} feature(s)</p>
        {formMode === "closed" && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-crimson-600 text-white hover:bg-crimson-700 transition-colors"
          >
            + Create Feature
          </button>
        )}
      </div>

      {formMode !== "closed" && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-navy-700 text-sm mb-4">
            {formMode === "create" ? "Create Feature" : "Edit Feature"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Feature Key</label>
                <input
                  value={form.featureKey}
                  onChange={(e) => updateField("featureKey", e.target.value)}
                  required
                  disabled={formMode === "edit"}
                  placeholder="e.g. listings, ai_assistant"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Feature Name</label>
                <input
                  value={form.featureName}
                  onChange={(e) => updateField("featureName", e.target.value)}
                  required
                  placeholder="e.g. MLS Listings"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Required Product (optional)</label>
                <input
                  value={form.requiredProduct}
                  onChange={(e) => updateField("requiredProduct", e.target.value)}
                  placeholder="e.g. core, marketing"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Free Limit (optional)</label>
                <input
                  type="number"
                  value={form.freeLimit}
                  onChange={(e) => updateField("freeLimit", e.target.value)}
                  min={0}
                  placeholder="Leave blank for unlimited"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateField("isActive", !form.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? "bg-green-500" : "bg-slate-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.isActive ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
                <span className="text-sm text-slate-600">Active</span>
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" loading={saving}>
                {formMode === "create" ? "Create Feature" : "Save Changes"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFormMode("closed")}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Feature Key</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Required Product</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Free Limit</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {features.map((feature) => (
                <tr key={feature.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <code className="text-xs bg-slate-50 text-navy-700 px-1.5 py-0.5 rounded">{feature.featureKey}</code>
                  </td>
                  <td className="px-5 py-3 font-medium text-navy-700">{feature.featureName}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{feature.requiredProduct ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{feature.freeLimit ?? "Unlimited"}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggle(feature)}
                      className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full transition-colors cursor-pointer",
                        feature.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      )}
                    >
                      {feature.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => openEdit(feature)}
                      className="text-xs font-medium text-navy-600 hover:text-navy-800 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {features.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No features configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
