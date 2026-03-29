"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    "AI Listing Descriptions",
    "AI Lead Scoring",
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
  ai_power_tools: "🤖",
  marketing_suite: "📣",
  growth_engine: "📈",
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
  const icon = BUNDLE_ICONS[bundle.productType] ?? "✨";

  const annualSavings =
    billingInterval === "annual"
      ? bundle.monthlyAmount * 12 - bundle.annualAmount
      : 0;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border transition-all duration-200",
        selected
          ? "border-crimson-500 bg-white shadow-elevated"
          : recommended
            ? "border-navy-400 bg-white shadow-card"
            : "border-slate-200 bg-white shadow-card hover:border-slate-300 hover:shadow-soft",
      )}
    >
      {recommended && !selected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-600 px-3 py-1 text-xs font-semibold text-white shadow">
            Most Popular
          </span>
        </div>
      )}
      {selected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-crimson-600 px-3 py-1 text-xs font-semibold text-white shadow">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Selected
          </span>
        </div>
      )}

      <div className="p-7 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl leading-none" aria-hidden="true">{icon}</span>
          <div>
            <h3 className="font-semibold text-navy-700 text-lg leading-tight">{bundle.name}</h3>
          </div>
        </div>

        <p className="text-slate-500 text-sm leading-relaxed mb-5">{bundle.description}</p>

        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold text-navy-700 font-serif">
            {formatDollars(displayedPrice)}
          </span>
          <span className="text-slate-400 text-sm mb-1.5">/mo</span>
        </div>
        {billingInterval === "annual" && (
          <p className="text-xs text-slate-400 mt-1">
            Billed annually ({formatDollars(price)}/yr)
            {annualSavings > 0 && (
              <span className="ml-1 text-emerald-600 font-medium">
                — save {formatDollars(annualSavings)}
              </span>
            )}
          </p>
        )}
        {billingInterval === "monthly" && (
          <p className="text-xs text-slate-400 mt-1">Billed monthly</p>
        )}
      </div>

      <div className="p-7 flex-1">
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
              <svg
                className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5"
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

      <div className="p-7 pt-0">
        <Button
          variant={selected ? "crimson" : recommended ? "primary" : "outline"}
          size="md"
          className="w-full"
          onClick={onToggle}
          disabled={loading}
          aria-pressed={selected}
        >
          {selected ? "Remove Bundle" : "Add Bundle"}
        </Button>
      </div>
    </div>
  );
}
