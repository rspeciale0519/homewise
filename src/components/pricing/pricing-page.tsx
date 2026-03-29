"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { BundleCard } from "./bundle-card";
import { AddonCard } from "./addon-card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { BundleWithFeatures } from "@/app/(marketing)/pricing/page";

type BillingInterval = "monthly" | "annual";

interface PricingPageProps {
  membership: BundleWithFeatures | null;
  bundles: BundleWithFeatures[];
  addOns: BundleWithFeatures[];
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
    question: "What payment methods are accepted?",
    answer:
      "We accept all major credit and debit cards, as well as ACH bank transfers (US accounts). Payments are processed securely through Stripe.",
  },
  {
    question: "What happens if my payment fails?",
    answer:
      "We provide a grace period and multiple retry attempts. You'll receive email notifications and have access to your account during that window. After the grace period, access to paid features is suspended until payment is resolved.",
  },
  {
    question: "Are there any setup fees?",
    answer:
      "No setup fees. You only pay the annual membership and any optional bundle or add-on subscriptions you select.",
  },
  {
    question: "What's the difference between bundles and add-ons?",
    answer:
      "Bundles are comprehensive feature sets (AI tools, marketing automation, growth analytics) billed monthly or annually. Add-ons are lightweight single-purpose enhancements billed monthly that you can layer on top of any plan.",
  },
];

export function PricingPage({ membership, bundles, addOns }: PricingPageProps) {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual");
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set());
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
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

  const toggleAddOn = useCallback((slug: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirectTo=/pricing");
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundles: Array.from(selectedBundles),
          addOns: Array.from(selectedAddOns),
          billingInterval,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Failed to start checkout. Please try again.");
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }, [billingInterval, selectedBundles, selectedAddOns, router]);

  const membershipAnnualPrice = membership?.annualAmount ?? 49900;
  const bundlesTotalMonthly = Array.from(selectedBundles).reduce((acc, slug) => {
    const b = bundles.find((b) => b.slug === slug);
    if (!b) return acc;
    return acc + (billingInterval === "annual" ? Math.round(b.annualAmount / 12) : b.monthlyAmount);
  }, 0);
  const addOnsTotal = Array.from(selectedAddOns).reduce((acc, slug) => {
    const a = addOns.find((a) => a.slug === slug);
    return acc + (a?.monthlyAmount ?? 0);
  }, 0);
  const membershipMonthlyEquiv = Math.round(membershipAnnualPrice / 12);
  const grandTotalMonthly = membershipMonthlyEquiv + bundlesTotalMonthly + addOnsTotal;

  const recommendedBundleType = "ai_power_tools";

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

        <Container size="lg" className="pt-16 pb-14 relative z-10 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            Agent Membership
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-white leading-tight text-balance mb-4">
            Choose Your Plan
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Start with the Annual Brokerage Membership, then add the feature bundles that
            match your business — AI tools, marketing automation, or growth analytics.
          </p>
        </Container>
      </div>

      {/* Billing interval toggle */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-soft">
        <Container size="lg" className="py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn(
                "px-5 py-2 rounded-md text-sm font-medium transition-all duration-150",
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
                "flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all duration-150",
                billingInterval === "annual"
                  ? "bg-white text-navy-700 shadow-sm"
                  : "text-slate-500 hover:text-navy-700",
              )}
            >
              Annual
              <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5">
                Save 15%
              </span>
            </button>
          </div>

          {(selectedBundles.size > 0 || selectedAddOns.size > 0) && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">
                Est.{" "}
                <span className="font-semibold text-navy-700">
                  {formatDollars(grandTotalMonthly)}/mo
                </span>
              </p>
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-crimson-600 px-5 py-2 text-sm font-semibold text-white hover:bg-crimson-700 transition-colors disabled:opacity-60"
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Subscribe Now
              </button>
            </div>
          )}
        </Container>
      </div>

      {/* Main content */}
      <div className="bg-cream-50 min-h-screen">
        <Container size="lg" className="py-14 space-y-16">

          {/* Membership card */}
          {membership && (
            <section>
              <div className="text-center mb-8">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-2">
                  Required
                </p>
                <h2 className="font-serif text-display-sm font-semibold text-navy-700">
                  Base Membership
                </h2>
                <p className="text-slate-500 text-sm mt-1 max-w-lg mx-auto">
                  Every agent starts here. Includes the full core platform.
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <div className="relative rounded-xl border-2 border-navy-600 bg-white shadow-elevated overflow-hidden">
                  <div className="bg-navy-700 px-6 py-4 text-white flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-navy-200 mb-0.5">
                        Annual Membership
                      </p>
                      <h3 className="font-serif text-xl font-semibold">{membership.name}</h3>
                    </div>
                    <span className="text-3xl" aria-hidden="true">🏠</span>
                  </div>

                  <div className="px-6 py-5">
                    <div className="flex items-end gap-1 mb-1">
                      <span className="font-serif text-4xl font-bold text-navy-700">
                        {formatDollars(Math.round(membershipAnnualPrice / 12))}
                      </span>
                      <span className="text-slate-400 text-sm mb-1.5">/mo</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-5">
                      Billed annually — {formatDollars(membershipAnnualPrice)}/yr
                    </p>

                    <ul className="space-y-2.5 mb-5">
                      {[
                        "CRM with up to 500 contacts",
                        "Property search & listing tools",
                        "Client portal & document sharing",
                        "Transaction coordination (10/yr)",
                        "Basic reporting & analytics",
                        "Training library access",
                        "Brokerage support & onboarding",
                      ].map((feature) => (
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

                    <p className="text-xs text-slate-400 italic">
                      Annual-only. Enhanceable with optional bundles below.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Bundles */}
          {bundles.length > 0 && (
            <section>
              <div className="text-center mb-8">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-2">
                  Optional
                </p>
                <h2 className="font-serif text-display-sm font-semibold text-navy-700">
                  Feature Bundles
                </h2>
                <p className="text-slate-500 text-sm mt-1 max-w-lg mx-auto">
                  Add the capabilities that fit your workflow. Mix and match as needed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bundles.map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    billingInterval={billingInterval}
                    selected={selectedBundles.has(bundle.slug)}
                    recommended={bundle.productType === recommendedBundleType}
                    onToggle={() => toggleBundle(bundle.slug)}
                    loading={loading}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Add-ons */}
          {addOns.length > 0 && (
            <section>
              <div className="text-center mb-8">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-2">
                  Enhancements
                </p>
                <h2 className="font-serif text-display-sm font-semibold text-navy-700">
                  Add-Ons
                </h2>
                <p className="text-slate-500 text-sm mt-1 max-w-lg mx-auto">
                  Single-purpose monthly add-ons that layer on top of any plan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {addOns.map((addon) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    selected={selectedAddOns.has(addon.slug)}
                    onToggle={() => toggleAddOn(addon.slug)}
                    loading={loading}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Summary & CTA */}
          <section className="rounded-2xl border border-navy-200 bg-gradient-navy p-8 text-white text-center">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold mb-2">
              Ready to Get Started?
            </h2>
            <p className="text-navy-200 text-sm mb-6 max-w-md mx-auto">
              Your selected plan:{" "}
              <span className="font-semibold text-white">
                Membership
                {selectedBundles.size > 0 &&
                  ` + ${selectedBundles.size} bundle${selectedBundles.size > 1 ? "s" : ""}`}
                {selectedAddOns.size > 0 &&
                  ` + ${selectedAddOns.size} add-on${selectedAddOns.size > 1 ? "s" : ""}`}
              </span>
              {" — "}
              <span className="font-semibold text-white">
                ~{formatDollars(grandTotalMonthly)}/mo
              </span>
            </p>

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-crimson-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-crimson-700 transition-colors shadow-lg disabled:opacity-60"
            >
              {loading && (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Subscribe & Checkout
            </button>

            <p className="text-navy-300 text-xs mt-4">
              Secure checkout via Stripe. Cancel anytime after your annual term.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <div className="text-center mb-8">
              <h2 className="font-serif text-display-sm font-semibold text-navy-700">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="max-w-2xl mx-auto space-y-3">
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
    </>
  );
}
