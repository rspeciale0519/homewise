"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BundleFeature {
  id: string;
  featureKey: string;
  limit: number | null;
}

interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyAmount: number;
  annualAmount: number;
  productType: string;
  isActive: boolean;
  sortOrder: number;
  platforms: string[];
  features: BundleFeature[];
}

type FormMode = "closed" | "create" | "edit";

interface BundleFormData {
  name: string;
  slug: string;
  description: string;
  monthlyAmount: string;
  annualAmount: string;
  productType: string;
  isActive: boolean;
  sortOrder: string;
  featureKeys: string;
}

const emptyForm: BundleFormData = {
  name: "",
  slug: "",
  description: "",
  monthlyAmount: "",
  annualAmount: "",
  productType: "",
  isActive: true,
  sortOrder: "0",
  featureKeys: "",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function BundleManagement() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BundleFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/bundles");
      if (res.ok) {
        const data = await res.json();
        setBundles(data.bundles);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setFormMode("create");
    setError(null);
  };

  const openEdit = (bundle: Bundle) => {
    setForm({
      name: bundle.name,
      slug: bundle.slug,
      description: bundle.description,
      monthlyAmount: String(bundle.monthlyAmount),
      annualAmount: String(bundle.annualAmount),
      productType: bundle.productType,
      isActive: bundle.isActive,
      sortOrder: String(bundle.sortOrder),
      featureKeys: bundle.features.map((f) => f.featureKey).join(", "),
    });
    setEditId(bundle.id);
    setFormMode("edit");
    setError(null);
  };

  const handleArchive = async (bundleId: string) => {
    const res = await fetch(`/api/admin/billing/bundles/${bundleId}`, { method: "DELETE" });
    if (res.ok) {
      fetchBundles();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const featureKeys = form.featureKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = formMode === "create"
      ? {
          name: form.name,
          slug: form.slug,
          description: form.description,
          monthlyAmount: parseInt(form.monthlyAmount, 10),
          annualAmount: parseInt(form.annualAmount, 10),
          productType: form.productType,
          isActive: form.isActive,
          sortOrder: parseInt(form.sortOrder, 10),
          featureKeys,
        }
      : {
          name: form.name,
          description: form.description,
          isActive: form.isActive,
          sortOrder: parseInt(form.sortOrder, 10),
          featureKeys,
        };

    try {
      const url = formMode === "create"
        ? "/api/admin/billing/bundles"
        : `/api/admin/billing/bundles/${editId}`;
      const method = formMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save bundle");
        return;
      }

      setFormMode("closed");
      fetchBundles();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof BundleFormData, value: string | boolean) => {
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
        <p className="text-sm text-slate-500">{bundles.length} bundle(s)</p>
        {formMode === "closed" && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-crimson-600 text-white hover:bg-crimson-700 transition-colors"
          >
            + Create Bundle
          </button>
        )}
      </div>

      {formMode !== "closed" && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <h3 className="font-semibold text-navy-700 text-sm mb-4">
            {formMode === "create" ? "Create Bundle" : "Edit Bundle"}
          </h3>
          {formMode === "edit" && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Existing bundles keep their original slug, product type, and prices so
              active Stripe subscriptions stay in sync. Create a new bundle if you need
              a new pricing structure.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  required
                  disabled={formMode === "edit"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={2}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Monthly Price (cents)</label>
                <input
                  type="number"
                  value={form.monthlyAmount}
                  onChange={(e) => updateField("monthlyAmount", e.target.value)}
                  required
                  min={0}
                  disabled={formMode === "edit"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Annual Price (cents)</label>
                <input
                  type="number"
                  value={form.annualAmount}
                  onChange={(e) => updateField("annualAmount", e.target.value)}
                  required
                  min={0}
                  disabled={formMode === "edit"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Product Type</label>
                <input
                  value={form.productType}
                  onChange={(e) => updateField("productType", e.target.value)}
                  required
                  placeholder="e.g. core, marketing, premium"
                  disabled={formMode === "edit"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => updateField("sortOrder", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Feature Keys (comma-separated)</label>
                <input
                  value={form.featureKeys}
                  onChange={(e) => updateField("featureKeys", e.target.value)}
                  placeholder="listings, ai_assistant, crm"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
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
                {formMode === "create" ? "Create Bundle" : "Save Changes"}
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
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Platforms</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Features</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bundles.map((bundle) => (
                <tr key={bundle.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy-700">{bundle.name}</p>
                    <p className="text-[10px] text-slate-400">{bundle.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {bundle.platforms.map((p) => (
                        <span
                          key={p}
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            p === "homewise"
                              ? "bg-navy-50 text-navy-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {bundle.productType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-navy-700">{formatCents(bundle.monthlyAmount)}</td>
                  <td className="px-5 py-3 text-navy-700">{formatCents(bundle.annualAmount)}</td>
                  <td className="px-5 py-3 text-slate-500">{bundle.features.length}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
                      bundle.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                    )}>
                      {bundle.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(bundle)}
                        className="text-xs font-medium text-navy-600 hover:text-navy-800 transition-colors"
                      >
                        Edit
                      </button>
                      {bundle.isActive && (
                        <button
                          onClick={() => handleArchive(bundle.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {bundles.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    No bundles configured yet.
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
