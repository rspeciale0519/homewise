"use client";

import { cn } from "@/lib/utils";
import type { BundleWithFeatures } from "@/app/(marketing)/pricing/page";

type BillingInterval = "monthly" | "annual";

interface BundleCardProps {
  bundle: BundleWithFeatures;
  billingInterval: BillingInterval;
  selected: boolean;
  recommended?: boolean;
  onToggle: () => void;
  loading: boolean;
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

export function BundleCard({
  bundle,
  billingInterval,
  selected,
  recommended = false,
  onToggle,
  loading,
}: BundleCardProps) {
  const price =
    billingInterval === "annual" ? bundle.annualAmount : bundle.monthlyAmount;
  const displayedPrice = billingInterval === "annual" ? Math.round(price / 12) : price;
  const features = BUNDLE_FEATURES_DISPLAY[bundle.productType] ?? [];
  const icon = BUNDLE_ICONS[bundle.productType] ?? "\u2728";

  const annualSavings =
    billingInterval === "annual"
      ? bundle.monthlyAmount * 12 - bundle.annualAmount
      : 0;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 transition-all duration-200 cursor-pointer group",
        selected
          ? "border-crimson-500 bg-white shadow-[0_4px_24px_rgba(220,38,38,0.12)]"
          : recommended
            ? "border-navy-400 bg-white shadow-lg"
            : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md",
      )}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Badges */}
      {recommended && !selected && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-700 px-4 py-1.5 text-xs font-bold text-white shadow-md tracking-wide uppercase">
            Most Popular
          </span>
        </div>
      )}
      {selected && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-crimson-600 px-4 py-1.5 text-xs font-bold text-white shadow-md tracking-wide uppercase">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Selected
          </span>
        </div>
      )}

      {/* Selected checkmark badge */}
      {selected && (
        <div className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-crimson-600 flex items-center justify-center shadow-md">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="p-7 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl leading-none" aria-hidden="true">{icon}</span>
          <h3 className="font-serif text-lg font-semibold text-navy-700 leading-tight">
            {bundle.name}
          </h3>
        </div>

        <p className="text-slate-500 text-sm leading-relaxed mb-5">
          {bundle.description}
        </p>

        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold text-navy-700 font-serif">
            {formatDollars(displayedPrice)}
          </span>
          <span className="text-slate-400 text-sm mb-1.5">/mo</span>
        </div>
        {billingInterval === "annual" && (
          <p className="text-xs text-slate-400 mt-1.5">
            Billed annually ({formatDollars(price)}/yr)
            {annualSavings > 0 && (
              <span className="ml-1.5 text-emerald-600 font-semibold">
                &mdash; save {formatDollars(annualSavings)}
              </span>
            )}
          </p>
        )}
        {billingInterval === "monthly" && (
          <p className="text-xs text-slate-400 mt-1.5">Billed monthly</p>
        )}
      </div>

      {/* Features */}
      <div className="p-7 flex-1">
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
              <svg
                className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <div className="p-7 pt-0">
        <button
          className={cn(
            "w-full py-3 rounded-xl text-sm font-bold transition-all duration-150",
            selected
              ? "bg-crimson-600 text-white shadow-md hover:bg-crimson-700"
              : recommended
                ? "bg-navy-700 text-white shadow-md hover:bg-navy-800"
                : "bg-slate-100 text-navy-700 hover:bg-slate-200",
          )}
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          type="button"
        >
          {selected ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Selected
            </span>
          ) : (
            "Add to Plan"
          )}
        </button>
      </div>
    </div>
  );
}
