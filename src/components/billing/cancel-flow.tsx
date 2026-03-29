"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SubscriptionItem {
  productType: string;
  productName: string;
  stripePriceId: string;
  quantity: number;
}

interface CancelFlowProps {
  items: SubscriptionItem[];
  periodEnd: string;
  onClose: () => void;
  onCanceled: () => void;
}

type CancelStep = "reason" | "lose" | "pause" | "confirm";

const CANCEL_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using", label: "Not using the features enough" },
  { value: "switching", label: "Switching to another platform" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "temporary", label: "Taking a temporary break" },
  { value: "other", label: "Other reason" },
];

export function CancelFlow({
  items,
  periodEnd,
  onClose,
  onCanceled,
}: CancelFlowProps) {
  const [step, setStep] = useState<CancelStep>("reason");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bundles = items.filter((item) => item.productType === "bundle");
  const endDate = new Date(periodEnd).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to cancel subscription");
      }
      onCanceled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const stepIndicator = (currentStep: CancelStep) => {
    const steps: CancelStep[] = ["reason", "lose", "pause", "confirm"];
    const currentIndex = steps.indexOf(currentStep);
    return (
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= currentIndex ? "bg-red-500" : "bg-slate-200",
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        {stepIndicator(step)}

        {/* Step 1: Reason */}
        {step === "reason" && (
          <>
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">
              Why are you canceling?
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Help us improve by sharing your reason.
            </p>
            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors",
                    reason === r.value
                      ? "border-navy-400 bg-navy-50 text-navy-700 font-medium"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={() => setStep("lose")}
                disabled={!reason}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: What you lose */}
        {step === "lose" && (
          <>
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">
              What you will lose
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Canceling will remove access to these features at the end of your
              current period:
            </p>
            <div className="space-y-2 mb-6">
              {bundles.length > 0 ? (
                bundles.map((item) => (
                  <div
                    key={item.stripePriceId}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-100"
                  >
                    <svg
                      className="h-4 w-4 text-red-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="text-sm text-red-700 font-medium">
                      {item.productName}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-sm text-red-700">
                    All subscription features and platform access
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setStep("reason")}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("pause")}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 3: Pause offer */}
        {step === "pause" && (
          <>
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">
              Would you prefer to pause instead?
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              If you are taking a break, we can keep your account and data intact
              while pausing billing.
            </p>
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-6">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Pausing keeps your data safe.</span>{" "}
                Contact support at{" "}
                <a
                  href="mailto:support@homewiserealty.com"
                  className="underline font-medium"
                >
                  support@homewiserealty.com
                </a>{" "}
                to arrange a pause on your subscription.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setStep("lose")}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Continue to Cancel
              </button>
            </div>
          </>
        )}

        {/* Step 4: Final confirm */}
        {step === "confirm" && (
          <>
            <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">
              Confirm Cancellation
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Your subscription will remain active until{" "}
              <span className="font-semibold text-navy-700">{endDate}</span>.
              After that date, you will lose access to all paid features.
            </p>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Keep My Plan
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Canceling..." : "Cancel Subscription"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
