"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PlanBundleCard } from "./plan-bundle-card";
import { FeaturePicker } from "@/components/pricing/feature-picker";
import type {
  BundleWithFeatures,
  FeatureEntitlement,
} from "@/app/(marketing)/pricing/page";

type BillingInterval = "monthly" | "annual";
type PlanMode = "bundles" | "build_your_own";

interface SubscriptionItem {
  productType: string;
  productName: string;
  stripePriceId: string;
  quantity: number;
}

interface PlanManagerProps {
  items: SubscriptionItem[];
  bundleConfigs: BundleWithFeatures[];
  entitlements: FeatureEntitlement[];
  billingInterval: BillingInterval;
  onBillingIntervalChange: (interval: BillingInterval) => void;
}

interface ConfirmDialog {
  type: "add" | "remove";
  bundleSlug: string;
  bundleName: string;
}

const BUNDLE_ORDER = ["marketing_suite", "ai_power_tools", "growth_engine"];

export function PlanManager({
  items,
  bundleConfigs,
  entitlements,
  billingInterval,
  onBillingIntervalChange,
}: PlanManagerProps) {
  const [mode, setMode] = useState<PlanMode>("bundles");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(
    null,
  );
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(),
  );

  const activeBundleSlugs = new Set(
    items
      .filter((item) => item.productType === "bundle")
      .map((item) => {
        const config = bundleConfigs.find(
          (b) =>
            b.monthlyPriceId === item.stripePriceId ||
            b.annualPriceId === item.stripePriceId,
        );
        return config?.slug;
      })
      .filter(Boolean) as string[],
  );

  const bundles = bundleConfigs
    .filter((b) => BUNDLE_ORDER.includes(b.productType))
    .sort(
      (a, b) =>
        BUNDLE_ORDER.indexOf(a.productType) -
        BUNDLE_ORDER.indexOf(b.productType),
    );

  const handleConfirmModify = useCallback(async () => {
    if (!confirmDialog) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscription/modify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addBundles:
            confirmDialog.type === "add" ? [confirmDialog.bundleSlug] : [],
          removeBundles:
            confirmDialog.type === "remove" ? [confirmDialog.bundleSlug] : [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error ?? "Failed to modify subscription",
        );
      }
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const handleToggleFeature = useCallback((featureKey: string) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureKey)) {
        next.delete(featureKey);
      } else {
        next.add(featureKey);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Mode toggle + billing interval */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
          <button
            type="button"
            onClick={() => setMode("bundles")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-semibold transition-colors",
              mode === "bundles"
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Bundles
          </button>
          <button
            type="button"
            onClick={() => setMode("build_your_own")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-semibold transition-colors",
              mode === "build_your_own"
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Build Your Own
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
          <button
            type="button"
            onClick={() => onBillingIntervalChange("monthly")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
              billingInterval === "monthly"
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => onBillingIntervalChange("annual")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
              billingInterval === "annual"
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Annual
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Bundles mode */}
      {mode === "bundles" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {bundles.map((bundle) => (
            <PlanBundleCard
              key={bundle.id}
              bundle={bundle}
              isActive={activeBundleSlugs.has(bundle.slug)}
              billingInterval={billingInterval}
              onAdd={() =>
                setConfirmDialog({
                  type: "add",
                  bundleSlug: bundle.slug,
                  bundleName: bundle.name,
                })
              }
              onRemove={() =>
                setConfirmDialog({
                  type: "remove",
                  bundleSlug: bundle.slug,
                  bundleName: bundle.name,
                })
              }
              loading={loading}
            />
          ))}
        </div>
      )}

      {/* Build Your Own mode */}
      {mode === "build_your_own" && (
        <FeaturePicker
          entitlements={entitlements}
          bundles={bundles}
          selectedFeatures={selectedFeatures}
          onToggleFeature={handleToggleFeature}
          loading={loading}
        />
      )}

      {/* Proration info */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Proration notice:</span> When you add
          or remove bundles, charges are prorated. You will only be billed for
          the remainder of your current billing period.
        </p>
      </div>

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">
              {confirmDialog.type === "add" ? "Add Bundle" : "Remove Bundle"}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {confirmDialog.type === "add"
                ? `Add ${confirmDialog.bundleName} to your plan? Charges will be prorated for the current billing period.`
                : `Remove ${confirmDialog.bundleName} from your plan? You will retain access until the end of your current billing period.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModify}
                disabled={loading}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors",
                  confirmDialog.type === "add"
                    ? "bg-navy-600 hover:bg-navy-700"
                    : "bg-red-600 hover:bg-red-700",
                )}
              >
                {loading
                  ? "Processing..."
                  : confirmDialog.type === "add"
                    ? "Confirm Add"
                    : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
