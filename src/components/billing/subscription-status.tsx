"use client";

import { cn } from "@/lib/utils";

interface SubscriptionItem {
  productType: string;
  productName: string;
  stripePriceId: string;
  quantity: number;
}

interface SubscriptionStatusProps {
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  items: SubscriptionItem[];
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  trialing: { bg: "bg-amber-50", text: "text-amber-700", label: "Trialing" },
  past_due: { bg: "bg-red-50", text: "text-red-700", label: "Past Due" },
  canceled: { bg: "bg-slate-100", text: "text-slate-500", label: "Canceled" },
  incomplete: { bg: "bg-orange-50", text: "text-orange-700", label: "Incomplete" },
  unpaid: { bg: "bg-red-50", text: "text-red-700", label: "Unpaid" },
};

const FALLBACK_BADGE = { bg: "bg-slate-50", text: "text-slate-400", label: "Unknown" };

export function SubscriptionStatus({
  status,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  trialEnd,
  items,
}: SubscriptionStatusProps) {
  const badge = STATUS_CONFIG[status] ?? FALLBACK_BADGE;

  const bundles = items.filter((item) => item.productType === "bundle");
  const addons = items.filter((item) => item.productType === "addon");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
            badge.bg,
            badge.text,
          )}
        >
          {badge.label}
        </span>
        {cancelAtPeriodEnd && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            Cancels at period end
          </span>
        )}
      </div>

      {status === "trialing" && trialEnd && (
        <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
          Trial ends on{" "}
          <strong>{new Date(trialEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Current period</p>
          <p className="text-navy-700">
            {new Date(currentPeriodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" — "}
            {new Date(currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {bundles.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Active bundles</p>
          <div className="flex flex-wrap gap-1.5">
            {bundles.map((item) => (
              <span
                key={item.stripePriceId}
                className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-navy-50 text-navy-600"
              >
                {item.productName}
              </span>
            ))}
          </div>
        </div>
      )}

      {addons.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Active add-ons</p>
          <div className="flex flex-wrap gap-1.5">
            {addons.map((item) => (
              <span
                key={item.stripePriceId}
                className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-crimson-50 text-crimson-700"
              >
                {item.productName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
