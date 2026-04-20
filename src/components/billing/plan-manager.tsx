"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PlanBundleCard } from "./plan-bundle-card";
import { FeaturePicker } from "@/components/pricing/feature-picker";
import type {
  ProductWithFeatures,
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
  subscription: { items: SubscriptionItem[] } | null;
  items?: SubscriptionItem[];
  productConfigs: ProductWithFeatures[];
  entitlements: FeatureEntitlement[];
  billingInterval?: BillingInterval;
  onBillingIntervalChange?: (interval: BillingInterval) => void;
  isNewSubscription?: boolean;
}

interface ConfirmDialog {
  type: "add" | "remove";
  bundleSlug: string;
  bundleName: string;
}

const BUNDLE_ORDER = ["marketing_suite", "ai_power_tools", "growth_engine"];

export function PlanManager({
  subscription,
  items: itemsProp,
  productConfigs,
  entitlements,
  billingInterval: billingIntervalProp,
  onBillingIntervalChange,
  isNewSubscription = false,
}: PlanManagerProps) {
  const items = itemsProp ?? subscription?.items ?? [];
  const [mode, setMode] = useState<PlanMode>("bundles");
  const [localInterval, setLocalInterval] = useState<BillingInterval>("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(
    null,
  );
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(),
  );
  const [selectedNewBundles, setSelectedNewBundles] = useState<Set<string>>(
    new Set(),
  );

  const billingInterval = billingIntervalProp ?? localInterval;
  const handleIntervalChange = onBillingIntervalChange ?? setLocalInterval;

  const activeBundleSlugs = new Set(
    items
      .filter((item) => item.productType === "bundle")
      .map((item) => {
        const config = productConfigs.find(
          (b) =>
            b.monthlyPriceId === item.stripePriceId ||
            b.annualPriceId === item.stripePriceId,
        );
        return config?.slug;
      })
      .filter(Boolean) as string[],
  );

  const bundles = productConfigs
    .filter((b) => BUNDLE_ORDER.includes(b.productType))
    .sort(
      (a, b) =>
        BUNDLE_ORDER.indexOf(a.productType) -
        BUNDLE_ORDER.indexOf(b.productType),
    );

  const toggleNewBundle = useCallback((slug: string) => {
    setSelectedNewBundles((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const handleNewSubscriptionCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundles: Array.from(selectedNewBundles),
          addOns: [],
          billingInterval,
        }),
      });
      const text = await res.text();
      let data: { url?: string; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start checkout");
      }
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [selectedNewBundles, billingInterval]);

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
            onClick={() => handleIntervalChange("monthly")}
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
            onClick={() => handleIntervalChange("annual")}
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {bundles.map((bundle) => (
              <PlanBundleCard
                key={bundle.id}
                bundle={bundle}
                isActive={
                  isNewSubscription
                    ? selectedNewBundles.has(bundle.slug)
                    : activeBundleSlugs.has(bundle.slug)
                }
                billingInterval={billingInterval}
                onAdd={() =>
                  isNewSubscription
                    ? toggleNewBundle(bundle.slug)
                    : setConfirmDialog({
                        type: "add",
                        bundleSlug: bundle.slug,
                        bundleName: bundle.name,
                      })
                }
                onRemove={() =>
                  isNewSubscription
                    ? toggleNewBundle(bundle.slug)
                    : setConfirmDialog({
                        type: "remove",
                        bundleSlug: bundle.slug,
                        bundleName: bundle.name,
                      })
                }
                loading={loading}
              />
            ))}
          </div>

          {/* Checkout button for new subscriptions */}
          {isNewSubscription && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleNewSubscriptionCheckout}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-crimson-600 text-white hover:bg-crimson-700 transition-colors disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Subscribe & Checkout
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </>
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
