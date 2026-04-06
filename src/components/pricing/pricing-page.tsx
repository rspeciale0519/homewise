"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { BundleCard } from "./bundle-card";
import { FeaturePicker } from "./feature-picker";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { BundleWithFeatures, FeatureEntitlement } from "@/app/(marketing)/pricing/page";

type BillingInterval = "monthly" | "annual";
type PlanMode = "bundles" | "build_your_own";

interface PricingPageProps {
  membership: BundleWithFeatures | null;
  bundles: BundleWithFeatures[];
  addOns: BundleWithFeatures[];
  entitlements: FeatureEntitlement[];
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const FAQ_ITEMS = [
  {
    question: "Is the annual membership required?",
    answer:
      "Yes. The Annual Brokerage Membership is the base plan required for all agents. It provides access to all core platform features including your CRM, property search tools, client portal, and transaction coordination.",
  },
  {
    question: "Can I add or remove bundles later?",
    answer:
      "Absolutely. You can upgrade or downgrade your bundle selection at any time from your billing dashboard. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "What\u2019s the difference between Bundles and Build Your Own?",
    answer:
      "Bundles are curated feature packages at a discounted price. Build Your Own lets you pick individual features \u00e0 la carte, but the total will typically be higher than the equivalent bundle.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept all major credit and debit cards, as well as ACH bank transfers (US accounts). Payments are processed securely through Stripe.",
  },
  {
    question: "What happens if my payment fails?",
    answer:
      "We provide a grace period and multiple retry attempts. You\u2019ll receive email notifications and have access to your account during that window. After the grace period, access to paid features is suspended until payment is resolved.",
  },
  {
    question: "Are there any setup fees?",
    answer:
      "No setup fees. You only pay the annual membership and any optional bundle or individual feature subscriptions you select.",
  },
];

export function PricingPage({
  membership,
  bundles,
  addOns: _addOns,
  entitlements,
}: PricingPageProps) {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual");
  const [planMode, setPlanMode] = useState<PlanMode>("bundles");
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set());
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleBundle = useCallback((slug: string) => {
    setSelectedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const toggleFeature = useCallback((featureKey: string) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureKey)) next.delete(featureKey);
      else next.add(featureKey);
      return next;
    });
  }, []);

  const handleModeSwitch = useCallback((mode: PlanMode) => {
    setPlanMode(mode);
    if (mode === "bundles") {
      setSelectedFeatures(new Set());
    } else {
      setSelectedBundles(new Set());
    }
  }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirectTo=/pricing");
        return;
      }

      const body =
        planMode === "bundles"
          ? { bundles: Array.from(selectedBundles), addOns: [], billingInterval }
          : { bundles: [], addOns: Array.from(selectedFeatures), billingInterval };

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Failed to start checkout. Please try again.");
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }, [billingInterval, planMode, selectedBundles, selectedFeatures, router]);

  const membershipPrice = membership?.annualAmount ?? 49900;

  const bundlesMonthlyTotal = useMemo(() => {
    return Array.from(selectedBundles).reduce((acc, slug) => {
      const bundle = bundles.find((item) => item.slug === slug);
      if (!bundle) return acc;
      return acc + (billingInterval === "annual" ? Math.round(bundle.annualAmount / 12) : bundle.monthlyAmount);
    }, 0);
  }, [selectedBundles, bundles, billingInterval]);

  const selectedItems = useMemo(() => {
    const items: { label: string; amount: string }[] = [];

    if (planMode === "bundles") {
      for (const slug of selectedBundles) {
        const bundle = bundles.find((item) => item.slug === slug);
        if (!bundle) continue;
        const price = billingInterval === "annual" ? Math.round(bundle.annualAmount / 12) : bundle.monthlyAmount;
        items.push({ label: bundle.name, amount: `${formatDollars(price)}/mo` });
      }
    } else {
      for (const key of selectedFeatures) {
        const entitlement = entitlements.find((item) => item.featureKey === key);
        if (entitlement) items.push({ label: entitlement.featureName, amount: "TBD" });
      }
    }

    return items;
  }, [planMode, selectedBundles, selectedFeatures, bundles, entitlements, billingInterval]);

  const hasSelections = selectedBundles.size > 0 || selectedFeatures.size > 0;
  const grandTotalMonthly = bundlesMonthlyTotal;

  const recommendedProductType = "ai_power_tools";

  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pricing-hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pricing-hero-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container size="xl" className="pt-20 pb-16 relative z-10 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            Agent Membership
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight text-balance mb-5">
            Choose Your Plan
          </h1>
          <p className="text-slate-300 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
            Start with the Annual Brokerage Membership, then add bundles or build
            your own plan.
          </p>
        </Container>
      </div>

      {/* Main content */}
      <div className="bg-cream-50 min-h-screen pb-28">
        <Container size="xl" className="py-10 sm:py-14 space-y-10">

          {/* Membership Banner */}
          {membership && (
            <div className="rounded-2xl bg-navy-700 px-6 sm:px-8 py-5 sm:py-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-3xl sm:text-4xl" aria-hidden="true">🏠</span>
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-semibold">{membership.name}</h2>
                  <p className="text-sm text-navy-200 mt-1">
                    Required &bull; CRM, search tools, training, transactions, basic analytics
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="font-serif text-3xl sm:text-4xl font-bold">
                  {formatDollars(membershipPrice)}
                  <span className="text-base font-normal text-navy-300">/year</span>
                </p>
                <p className="text-xs text-navy-300 mt-1">Billed annually</p>
              </div>
            </div>
          )}

          {/* Plan Mode Tabs + Billing Interval */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1.5">
              <button
                onClick={() => handleModeSwitch("bundles")}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150",
                  planMode === "bundles"
                    ? "bg-white text-navy-700 shadow-sm"
                    : "text-slate-500 hover:text-navy-700",
                )}
              >
                Bundles
              </button>
              <button
                onClick={() => handleModeSwitch("build_your_own")}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150",
                  planMode === "build_your_own"
                    ? "bg-white text-navy-700 shadow-sm"
                    : "text-slate-500 hover:text-navy-700",
                )}
              >
                Build Your Own
              </button>
            </div>

            {planMode === "bundles" && (
              <div className="flex items-center gap-2.5 bg-slate-100 rounded-xl p-1.5">
                <button
                  onClick={() => setBillingInterval("monthly")}
                  className={cn(
                    "px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    billingInterval === "monthly"
                      ? "bg-white text-navy-700 shadow-sm"
                      : "text-slate-500 hover:text-navy-700",
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval("annual")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    billingInterval === "annual"
                      ? "bg-white text-navy-700 shadow-sm"
                      : "text-slate-500 hover:text-navy-700",
                  )}
                >
                  Annual
                  <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5">
                    Save 15%
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Bundles Tab */}
          {planMode === "bundles" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {bundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  billingInterval={billingInterval}
                  selected={selectedBundles.has(bundle.slug)}
                  recommended={bundle.productType === recommendedProductType}
                  onToggle={() => toggleBundle(bundle.slug)}
                  loading={loading}
                />
              ))}
            </div>
          )}

          {/* Build Your Own Tab */}
          {planMode === "build_your_own" && (
            <FeaturePicker
              entitlements={entitlements}
              bundles={bundles}
              selectedFeatures={selectedFeatures}
              onToggleFeature={toggleFeature}
              loading={loading}
            />
          )}

          {/* FAQ */}
          <section className="pt-8">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy-700">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-semibold text-navy-700 hover:bg-slate-50 transition-colors"
                    aria-expanded={openFaq === index}
                  >
                    <span>{item.question}</span>
                    <svg
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                        openFaq === index && "rotate-180",
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </Container>
      </div>

      {/* Sticky Bottom Checkout Bar */}
      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-50 transform transition-all duration-300 ease-out",
          hasSelections
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div className="bg-white border-t-2 border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          <Container size="xl" className="py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: selected items summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-navy-700 text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap">
                    🏠 {formatDollars(membershipPrice)}/yr
                  </span>
                  {selectedItems.map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1">
                      <span className="text-slate-300 text-xs">+</span>
                      <span className="bg-crimson-50 text-crimson-700 text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap">
                        {item.label} {item.amount}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: total + CTA */}
              <div className="flex items-center gap-4 shrink-0">
                {planMode === "bundles" && grandTotalMonthly > 0 && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total</p>
                    <p className="text-lg font-bold text-navy-700 leading-tight">
                      {formatDollars(grandTotalMonthly)}
                      <span className="text-xs font-normal text-slate-400">/mo</span>
                      <span className="text-xs text-slate-400 ml-1">+ {formatDollars(membershipPrice)}/yr</span>
                    </p>
                  </div>
                )}
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-crimson-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-crimson-700 transition-colors disabled:opacity-60 shadow-lg whitespace-nowrap"
                >
                  {loading && (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Subscribe &amp; Checkout
                </button>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </>
  );
}
