"use client";

import { cn } from "@/lib/utils";
import type { ProductWithFeatures, FeatureEntitlement } from "@/app/(marketing)/pricing/page";

interface FeaturePickerProps {
  entitlements: FeatureEntitlement[];
  bundles: ProductWithFeatures[];
  selectedFeatures: Set<string>;
  onToggleFeature: (featureKey: string) => void;
  loading: boolean;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const CATEGORY_CONFIG: {
  productType: string;
  label: string;
  icon: string;
}[] = [
  { productType: "ai_power_tools", label: "AI Tools", icon: "\uD83E\uDD16" },
  { productType: "marketing_suite", label: "Marketing", icon: "\uD83D\uDCE3" },
  { productType: "growth_engine", label: "Growth", icon: "\uD83D\uDCC8" },
];

const FEATURE_PRICES: Record<string, number> = {
  ai_cma_reports: 900,
  ai_lead_scoring: 700,
  ai_listing_descriptions: 500,
  ai_social_posts: 500,
  ai_meeting_prep: 500,
  ai_follow_up_drafts: 500,
  ai_email_content: 500,
  campaign_builder: 1500,
  drip_sequences: 1200,
  ab_subject_testing: 800,
  broadcast_emails: 1000,
  email_analytics: 800,
  automation_triggers: 1000,
  sms_campaigns: 1200,
  priority_lead_routing: 2000,
  advanced_lead_scoring: 1500,
  team_dashboards: 1500,
  unlimited_transactions: 1200,
  performance_analytics: 1200,
  api_access: 2500,
  white_label_cma: 1500,
};

export function FeaturePicker({
  entitlements,
  bundles,
  selectedFeatures,
  onToggleFeature,
  loading,
}: FeaturePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
      {CATEGORY_CONFIG.map(({ productType, label, icon }) => {
        const categoryFeatures = entitlements.filter(
          (e) => e.requiredProduct === productType,
        );
        const bundle = bundles.find((b) => b.productType === productType);
        const categorySelectedCount = categoryFeatures.filter((f) =>
          selectedFeatures.has(f.featureKey),
        ).length;
        const individualTotal = categoryFeatures
          .filter((f) => selectedFeatures.has(f.featureKey))
          .reduce((sum, f) => sum + (FEATURE_PRICES[f.featureKey] ?? 0), 0);

        return (
          <div
            key={productType}
            className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden"
          >
            {/* Category header */}
            <div className="px-7 pt-7 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl" aria-hidden="true">{icon}</span>
                <h3 className="font-serif text-lg font-semibold text-navy-700">{label}</h3>
              </div>
              {categorySelectedCount > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  {categorySelectedCount} selected &bull; {formatDollars(individualTotal)}/mo
                </p>
              )}
            </div>

            {/* Feature checkboxes */}
            <div className="p-7 space-y-1">
              {categoryFeatures.map((feature) => {
                const isSelected = selectedFeatures.has(feature.featureKey);
                const price = FEATURE_PRICES[feature.featureKey] ?? 0;

                return (
                  <button
                    key={feature.featureKey}
                    type="button"
                    onClick={() => onToggleFeature(feature.featureKey)}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      isSelected
                        ? "bg-crimson-50"
                        : "hover:bg-slate-50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-crimson-600 border-crimson-600"
                          : "border-slate-300",
                      )}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={cn(
                      "flex-1 text-sm",
                      isSelected ? "text-navy-700 font-medium" : "text-slate-600",
                    )}>
                      {feature.featureName}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 shrink-0">
                      {formatDollars(price)}/mo
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bundle savings nudge */}
            {bundle && (
              <div className="px-7 pb-6">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <p className="text-xs text-emerald-800">
                    <span className="font-bold">Bundle &amp; save:</span>{" "}
                    Get all {label} features for{" "}
                    <span className="font-bold">
                      {formatDollars(bundle.monthlyAmount)}/mo
                    </span>{" "}
                    instead of picking individually.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
