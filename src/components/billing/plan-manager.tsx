"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { PlanBundleCard } from "./plan-bundle-card";
import { FeaturePicker } from "@/components/pricing/feature-picker";
import { Button } from "@/components/ui/button";
import type { FeatureEntitlement } from "@/app/(marketing)/pricing/page";
import type {
  BillingInterval,
  BillingProduct,
  SubscriptionLineItem,
} from "./types";

interface PlanManagerProps {
  subscription: { items: SubscriptionLineItem[] } | null;
  items?: SubscriptionLineItem[];
  productConfigs: BillingProduct[];
  entitlements: FeatureEntitlement[];
  billingInterval?: BillingInterval;
  onBillingIntervalChange?: (interval: BillingInterval) => void;
  isNewSubscription?: boolean;
}

interface ConfirmDialog {
  type: "add" | "remove";
  productKind: "plan" | "add_on";
  productSlug: string;
  productName: string;
  productLabel: "Bundle" | "Membership" | "Add-on";
}

const PLAN_ORDER = [
  "membership",
  "marketing_suite",
  "ai_power_tools",
  "growth_engine",
];
const EMPTY_SUBSCRIPTION_ITEMS: SubscriptionLineItem[] = [];

export function PlanManager({
  subscription,
  items: itemsProp,
  productConfigs,
  entitlements: _entitlements,
  billingInterval: billingIntervalProp,
  onBillingIntervalChange,
  isNewSubscription = false,
}: PlanManagerProps) {
  const items = itemsProp ?? subscription?.items ?? EMPTY_SUBSCRIPTION_ITEMS;
  const [localInterval, setLocalInterval] = useState<BillingInterval>("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(
    null,
  );
  const [selectedNewBundles, setSelectedNewBundles] = useState<Set<string>>(
    new Set(),
  );
  const checkoutOperationIdRef = useRef<string | null>(null);
  const modifyOperationRef = useRef<{
    signature: string;
    operationId: string;
  } | null>(null);

  const plans = useMemo(() => productConfigs
    .filter(
      (product) => product.isActive && PLAN_ORDER.includes(product.productType),
    )
    .sort(
      (a, b) =>
        PLAN_ORDER.indexOf(a.productType) -
        PLAN_ORDER.indexOf(b.productType),
    ), [productConfigs]);

  const supportsMonthly = plans.some((product) => product.monthlyPriceId);
  const supportsAnnual = plans.some((product) => product.annualPriceId);
  const requestedInterval = billingIntervalProp ?? localInterval;
  const billingInterval = requestedInterval === "monthly" && !supportsMonthly
    ? "annual"
    : requestedInterval === "annual" && !supportsAnnual
      ? "monthly"
      : requestedInterval;

  const handleIntervalChange = useCallback((interval: BillingInterval) => {
    checkoutOperationIdRef.current = null;
    if (onBillingIntervalChange) onBillingIntervalChange(interval);
    else setLocalInterval(interval);
  }, [onBillingIntervalChange]);

  const { activePlanSlugs, activeAddOnSlugs } = useMemo(() => {
    const activeProducts = items
      .map((item) => productConfigs.find(
        (product) =>
          product.monthlyPriceId === item.stripePriceId ||
          product.annualPriceId === item.stripePriceId,
      ))
      .filter((product): product is BillingProduct => product !== undefined);

    return {
      activePlanSlugs: new Set(
        activeProducts
          .filter((product) => PLAN_ORDER.includes(product.productType))
          .map((product) => product.slug),
      ),
      activeAddOnSlugs: new Set(
        activeProducts
          .filter((product) => product.productType === "add_on")
          .map((product) => product.slug),
      ),
    };
  }, [items, productConfigs]);

  const addOns = useMemo(
    () => productConfigs.filter((product) => product.productType === "add_on"),
    [productConfigs],
  );

  const activeAddOns = useMemo(
    () => addOns.filter((product) => activeAddOnSlugs.has(product.slug)),
    [activeAddOnSlugs, addOns],
  );

  const toggleNewBundle = useCallback((slug: string) => {
    checkoutOperationIdRef.current = null;
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
      const operationId = checkoutOperationIdRef.current ?? crypto.randomUUID();
      checkoutOperationIdRef.current = operationId;
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId,
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
  }, [billingInterval, selectedNewBundles]);

  const handleConfirmModify = useCallback(async () => {
    if (!confirmDialog) return;
    setLoading(true);
    setError(null);
    try {
      const signature = [
        confirmDialog.type,
        confirmDialog.productKind,
        confirmDialog.productSlug,
      ].join(":");
      const operationId = modifyOperationRef.current?.signature === signature
        ? modifyOperationRef.current.operationId
        : crypto.randomUUID();
      modifyOperationRef.current = { signature, operationId };
      const res = await fetch("/api/billing/subscription/modify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId,
          addBundles:
            confirmDialog.productKind === "plan" && confirmDialog.type === "add"
              ? [confirmDialog.productSlug]
              : [],
          removeBundles:
            confirmDialog.productKind === "plan" && confirmDialog.type === "remove"
              ? [confirmDialog.productSlug]
              : [],
          addOns:
            confirmDialog.productKind === "add_on" && confirmDialog.type === "add"
              ? [confirmDialog.productSlug]
              : [],
          removeAddOns:
            confirmDialog.productKind === "add_on" && confirmDialog.type === "remove"
              ? [confirmDialog.productSlug]
              : [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error ?? "Failed to modify subscription",
        );
      }
      modifyOperationRef.current = null;
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, [confirmDialog]);

  const dismissConfirmDialog = useCallback(() => {
    modifyOperationRef.current = null;
    setConfirmDialog(null);
  }, []);

  const handleRemoveAddOn = useCallback((slug: string) => {
    const addOn = addOns.find((product) => product.slug === slug);
    if (!addOn || !activeAddOnSlugs.has(slug)) return;
    setConfirmDialog({
      type: "remove",
      productKind: "add_on",
      productSlug: slug,
      productName: addOn.name,
      productLabel: "Add-on",
    });
  }, [activeAddOnSlugs, addOns]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-lg font-semibold text-navy-700">
            {isNewSubscription ? "Available plans" : "Manage plans"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a plan with benefits that are available now.
          </p>
        </div>

        {isNewSubscription && supportsMonthly && supportsAnnual && (
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
            aria-label="Plan billing interval"
          >
            <button
              type="button"
              onClick={() => handleIntervalChange("monthly")}
              aria-pressed={billingInterval === "monthly"}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
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
              aria-pressed={billingInterval === "annual"}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                billingInterval === "annual"
                  ? "bg-white text-navy-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              Annual
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {plans.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const productLabel = plan.productType === "membership"
              ? "Membership"
              : "Bundle";
            const isPlanActive = isNewSubscription
              ? selectedNewBundles.has(plan.slug)
              : activePlanSlugs.has(plan.slug);
            const isFinalActivePlan =
              !isNewSubscription && isPlanActive && activePlanSlugs.size === 1;
            return (
              <PlanBundleCard
                key={plan.id}
                bundle={plan}
                isActive={isPlanActive}
                billingInterval={billingInterval}
                onAdd={() =>
                  isNewSubscription
                    ? toggleNewBundle(plan.slug)
                    : setConfirmDialog({
                        type: "add",
                        productKind: "plan",
                        productSlug: plan.slug,
                        productName: plan.name,
                        productLabel,
                      })
                }
                onRemove={() => {
                  if (isFinalActivePlan) return;
                  if (isNewSubscription) {
                    toggleNewBundle(plan.slug);
                  } else {
                    setConfirmDialog({
                      type: "remove",
                      productKind: "plan",
                      productSlug: plan.slug,
                      productName: plan.name,
                      productLabel,
                    });
                  }
                }}
                loading={loading}
                removeDisabled={isFinalActivePlan}
              />
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          No plans are available now.
        </p>
      )}

      {!isNewSubscription && activeAddOns.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="current-add-ons-title">
          <div>
            <h3
              id="current-add-ons-title"
              className="font-serif text-base font-semibold text-navy-700"
            >
              Current add-ons
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              New add-on purchases are unavailable. You can remove an existing add-on.
            </p>
          </div>
          <FeaturePicker
            addOns={activeAddOns}
            selectedAddOns={activeAddOnSlugs}
            onToggleAddOn={handleRemoveAddOn}
            loading={loading}
          />
        </section>
      )}

      {isNewSubscription && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="crimson"
            size="lg"
            onClick={handleNewSubscriptionCheckout}
            disabled={loading || selectedNewBundles.size === 0}
          >
            {loading ? "Processing..." : "Subscribe & Checkout"}
          </Button>
        </div>
      )}

      {!isNewSubscription && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Proration notice:</span> When you add
            or remove products, charges are prorated. You will only be billed for
            the remainder of your current billing period.
          </p>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">
              {confirmDialog.type === "add" ? "Add" : "Remove"}{" "}
              {confirmDialog.productLabel}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {confirmDialog.type === "add"
                ? `Add ${confirmDialog.productName} to your plan? Charges will be prorated for the current billing period.`
                : `Remove ${confirmDialog.productName} now? Stripe will prorate the current billing period.`}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={dismissConfirmDialog}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmDialog.type === "add" ? "primary" : "destructive"}
                size="sm"
                onClick={handleConfirmModify}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : confirmDialog.type === "add"
                    ? "Confirm Add"
                    : "Confirm Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
