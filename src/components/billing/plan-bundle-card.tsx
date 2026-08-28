"use client";

import { cn } from "@/lib/utils";
import type { ProductWithFeatures } from "@/app/(marketing)/pricing/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BillingInterval = "monthly" | "annual";

interface PlanBundleCardProps {
  bundle: ProductWithFeatures;
  isActive: boolean;
  billingInterval: BillingInterval;
  onAdd: () => void;
  onRemove: () => void;
  loading: boolean;
  removeDisabled: boolean;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const BUNDLE_FEATURES_DISPLAY: Record<string, string[]> = {
  ai_power_tools: [
    "AI CMA Reports (unlimited)",
    "AI Lead Scoring (10-point)",
    "AI Listing Descriptions",
    "AI Social Post Creator",
    "AI Meeting Prep Briefs",
    "AI Follow-Up Drafts",
    "AI Email Content Generator",
  ],
  marketing_suite: [
    "Visual Campaign Builder",
    "Drip Email Sequences",
    "A/B Subject Line Testing",
    "Broadcast Emails",
    "Email Open & Click Analytics",
    "Behavioral Automation Triggers",
    "SMS Campaigns",
  ],
  growth_engine: [
    "Priority Lead Routing Rules",
    "Advanced Lead Scoring",
    "Team Performance Dashboards",
    "Unlimited Transaction Tracking",
    "Pipeline & Revenue Analytics",
    "REST API Access",
    "White-Label CMA Reports",
  ],
};

const BUNDLE_ICONS: Record<string, string> = {
  ai_power_tools: "\uD83E\uDD16",
  marketing_suite: "\uD83D\uDCE3",
  growth_engine: "\uD83D\uDCC8",
};

export function PlanBundleCard({
  bundle,
  isActive,
  billingInterval,
  onAdd,
  onRemove,
  loading,
  removeDisabled,
}: PlanBundleCardProps) {
  const price =
    billingInterval === "annual" ? bundle.annualAmount : bundle.monthlyAmount;
  const displayedPrice =
    billingInterval === "annual" ? Math.round(price / 12) : price;
  const features = BUNDLE_FEATURES_DISPLAY[bundle.productType] ?? [];
  const icon = BUNDLE_ICONS[bundle.productType] ?? "\u2728";
  const productLabel = bundle.productType === "membership"
    ? "Membership"
    : "Bundle";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl overflow-hidden transition-all duration-200",
        isActive
          ? "border-2 border-emerald-500 bg-emerald-50/30"
          : "border-2 border-dashed border-slate-300 bg-white",
      )}
    >
      {isActive && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="success" size="sm">Active</Badge>
        </div>
      )}

      <div className="p-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl leading-none" aria-hidden="true">
            {icon}
          </span>
          <h3 className="font-serif text-lg font-semibold text-navy-700 leading-tight">
            {bundle.name}
          </h3>
        </div>
        <p className="mb-3 text-sm text-slate-500">{bundle.description}</p>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-navy-700 font-serif">
            {formatDollars(displayedPrice)}
          </span>
          <span className="text-slate-400 text-sm mb-0.5">/mo</span>
        </div>
        {billingInterval === "annual" && (
          <p className="text-xs text-slate-400 mt-1">
            Billed annually ({formatDollars(price)}/yr)
          </p>
        )}
      </div>

      <div className="p-6 flex-1">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-slate-600"
            >
              <svg
                className={cn(
                  "h-4 w-4 shrink-0 mt-0.5",
                  isActive ? "text-emerald-500" : "text-slate-300",
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 pt-0">
        {isActive ? (
          <Button
            onClick={onRemove}
            disabled={loading || removeDisabled}
            variant="destructive"
            className="w-full"
            type="button"
          >
            {loading ? "Updating..." : `Remove ${productLabel}`}
          </Button>
        ) : (
          <Button
            onClick={onAdd}
            disabled={loading}
            variant="secondary"
            className="w-full"
            type="button"
          >
            {loading ? "Updating..." : `Add ${productLabel}`}
          </Button>
        )}
        {isActive && removeDisabled && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Cancel the subscription to remove the final plan.
          </p>
        )}
      </div>
    </div>
  );
}
