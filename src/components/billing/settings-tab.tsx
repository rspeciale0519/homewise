"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CancelFlow } from "./cancel-flow";

type BillingInterval = "monthly" | "annual";

interface SubscriptionItem {
  productType: string;
  productName: string;
  stripePriceId: string;
  quantity: number;
}

interface SettingsTabProps {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  billingInterval: BillingInterval;
  items: SubscriptionItem[];
}

export function SettingsTab({
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  billingInterval,
  items,
}: SettingsTabProps) {
  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetInterval: BillingInterval =
    billingInterval === "monthly" ? "annual" : "monthly";

  const handleIntervalSwitch = async () => {
    setIntervalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscription/interval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: targetInterval }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error ?? "Failed to change billing interval",
        );
      }
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
        {isActive && !cancelAtPeriodEnd && (
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
        {billingInterval === "monthly" && isActive && !cancelAtPeriodEnd && (
          <p className="text-xs text-emerald-600 mt-2">
            Switch to annual billing to save up to 20%.
          </p>
        )}
      </div>

      {/* Email preferences */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-serif text-base font-semibold text-navy-700 mb-1">
          Email Notifications
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Manage which billing-related emails you receive.
        </p>
        <div className="space-y-3">
          <EmailToggle
            label="Invoice receipts"
            description="Receive a receipt each time a payment is processed"
            defaultEnabled={true}
          />
          <EmailToggle
            label="Upcoming renewal reminders"
            description="Get notified 7 days before your subscription renews"
            defaultEnabled={true}
          />
          <EmailToggle
            label="Payment failure alerts"
            description="Be alerted immediately if a payment attempt fails"
            defaultEnabled={true}
          />
        </div>
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

function EmailToggle({
  label,
  description,
  defaultEnabled,
}: {
  label: string;
  description: string;
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-navy-700">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
          enabled ? "bg-navy-600" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5",
            enabled ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
