"use client";

import { useRef, useState } from "react";
import { CancelFlow } from "./cancel-flow";
import type { BillingInterval, SubscriptionLineItem } from "./types";

interface SettingsTabProps {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  billingInterval: BillingInterval;
  canChangeBillingInterval: boolean;
  items: SubscriptionLineItem[];
}

export function SettingsTab({
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  billingInterval,
  canChangeBillingInterval,
  items,
}: SettingsTabProps) {
  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalOperationRef = useRef<{
    target: BillingInterval;
    operationId: string;
  } | null>(null);

  const targetInterval: BillingInterval =
    billingInterval === "monthly" ? "annual" : "monthly";

  const handleIntervalSwitch = async () => {
    setIntervalLoading(true);
    setError(null);
    try {
      const operationId = intervalOperationRef.current?.target === targetInterval
        ? intervalOperationRef.current.operationId
        : crypto.randomUUID();
      intervalOperationRef.current = { target: targetInterval, operationId };
      const res = await fetch("/api/billing/subscription/interval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId, interval: targetInterval }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error ?? "Failed to change billing interval",
        );
      }
      intervalOperationRef.current = null;
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIntervalLoading(false);
    }
  };

  const isActive = status === "active" || status === "trialing";
  const periodEndFormatted = new Date(currentPeriodEnd).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Billing interval */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-serif text-base font-semibold text-navy-700 mb-1">
          Billing Interval
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          You are currently billed{" "}
          <span className="font-semibold text-navy-700">
            {billingInterval === "annual" ? "annually" : "monthly"}
          </span>
          .
        </p>
        {isActive && !cancelAtPeriodEnd && canChangeBillingInterval && (
          <button
            type="button"
            onClick={handleIntervalSwitch}
            disabled={intervalLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {intervalLoading
              ? "Switching..."
              : `Switch to ${targetInterval === "annual" ? "Annual" : "Monthly"} Billing`}
          </button>
        )}
        {billingInterval === "monthly" &&
          isActive &&
          !cancelAtPeriodEnd &&
          canChangeBillingInterval && (
          <p className="text-xs text-emerald-600 mt-2">
            Switch to annual billing to save up to 20%.
          </p>
        )}
        {isActive && !cancelAtPeriodEnd && !canChangeBillingInterval && (
          <p className="text-xs text-slate-500">
            No alternate billing interval is available for your current products.
          </p>
        )}
      </div>

      {/* Cancel subscription */}
      {isActive && (
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-6">
          <h3 className="font-serif text-base font-semibold text-red-800 mb-1">
            Cancel Subscription
          </h3>
          {cancelAtPeriodEnd ? (
            <p className="text-sm text-red-700">
              Your subscription is set to cancel on{" "}
              <span className="font-semibold">{periodEndFormatted}</span>. You
              will retain access until then.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Cancel your subscription. You will retain access to all features
                until the end of your current billing period on{" "}
                <span className="font-semibold text-navy-700">
                  {periodEndFormatted}
                </span>
                .
              </p>
              <button
                type="button"
                onClick={() => setShowCancelFlow(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Cancel Subscription
              </button>
            </>
          )}
        </div>
      )}

      {showCancelFlow && (
        <CancelFlow
          items={items}
          periodEnd={currentPeriodEnd}
          onClose={() => setShowCancelFlow(false)}
          onCanceled={() => window.location.reload()}
        />
      )}
    </div>
  );
}
