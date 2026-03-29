"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PlanManager } from "./plan-manager";
import { PaymentMethodsTab } from "./payment-methods-tab";
import { InvoicesTab } from "./invoices-tab";
import { SettingsTab } from "./settings-tab";
import type {
  BundleWithFeatures,
  FeatureEntitlement,
} from "@/app/(marketing)/pricing/page";

interface SubscriptionItem {
  productType: string;
  productName: string;
  stripePriceId: string;
  quantity: number;
}

interface Subscription {
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  items: SubscriptionItem[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  paymentType: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

type TabKey = "plan" | "payments" | "invoices" | "settings";
type BillingInterval = "monthly" | "annual";

interface BillingDashboardProps {
  subscription: Subscription | null;
  paymentRecords: PaymentRecord[];
  hasStripeCustomer: boolean;
  bundleConfigs: BundleWithFeatures[];
  entitlements: FeatureEntitlement[];
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  trialing: "bg-amber-500",
  past_due: "bg-red-500",
  canceled: "bg-slate-400",
  incomplete: "bg-orange-500",
  unpaid: "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past Due",
  canceled: "Canceled",
  incomplete: "Incomplete",
  unpaid: "Unpaid",
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "plan",
    label: "My Plan",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    key: "payments",
    label: "Payment Methods",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    key: "invoices",
    label: "Invoices",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function BillingDashboard({
  subscription,
  paymentRecords: _paymentRecords,
  hasStripeCustomer: _hasStripeCustomer,
  bundleConfigs,
  entitlements,
}: BillingDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("plan");

  const billingInterval = useMemo<BillingInterval>(() => {
    if (!subscription) return "monthly";
    const hasAnnual = subscription.items.some((item) =>
      bundleConfigs.some((b) => b.annualPriceId === item.stripePriceId),
    );
    return hasAnnual ? "annual" : "monthly";
  }, [subscription, bundleConfigs]);

  const [currentInterval, setCurrentInterval] =
    useState<BillingInterval>(billingInterval);

  const activeItemCount = subscription?.items.filter(
    (i) => i.productType === "bundle",
  ).length ?? 0;

  const estimatedTotal = useMemo(() => {
    if (!subscription) return 0;
    return subscription.items.reduce((sum, item) => {
      const config = bundleConfigs.find(
        (b) =>
          b.monthlyPriceId === item.stripePriceId ||
          b.annualPriceId === item.stripePriceId,
      );
      if (!config) return sum;
      if (currentInterval === "annual") {
        return sum + Math.round(config.annualAmount / 12);
      }
      return sum + config.monthlyAmount;
    }, 0);
  }, [subscription, bundleConfigs, currentInterval]);

  // No subscription state — show plan selection inline
  if (!subscription) {
    const membershipConfig = bundleConfigs.find((b) => b.productType === "membership");
    const bundleOrder = ["marketing_suite", "ai_power_tools", "growth_engine"];
    const availableBundles = bundleConfigs
      .filter((b) => bundleOrder.includes(b.productType))
      .sort((a, b) => bundleOrder.indexOf(a.productType) - bundleOrder.indexOf(b.productType));

    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-navy-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold">Annual Brokerage Membership</span>
          </div>
          {membershipConfig && (
            <span className="text-lg font-bold">
              ${(membershipConfig.annualAmount / 100).toFixed(0)}
              <span className="text-xs font-normal text-navy-300">/year</span>
            </span>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="text-center mb-8">
            <h3 className="font-serif text-xl font-semibold text-navy-700 mb-2">
              Enhance your membership
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Add optional bundles to unlock AI tools, marketing automation,
              and growth analytics on top of your brokerage membership.
            </p>
          </div>

          <PlanManager
            subscription={null}
            bundleConfigs={bundleConfigs}
            entitlements={entitlements}
            isNewSubscription
          />
        </div>
      </div>
    );
  }

  const statusDot = STATUS_DOT[subscription.status] ?? "bg-slate-400";
  const statusLabel = STATUS_LABEL[subscription.status] ?? subscription.status;
  const nextBillingDate = new Date(
    subscription.currentPeriodEnd,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Plan summary bar */}
      <div className="rounded-xl bg-navy-800 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", statusDot)} />
              <span className="text-sm font-semibold text-white">
                {statusLabel}
              </span>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                Cancels at period end
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-white/50 text-xs">Active bundles</span>
              <p className="text-white font-semibold">{activeItemCount}</p>
            </div>
            <div>
              <span className="text-white/50 text-xs">Next billing</span>
              <p className="text-white font-semibold">{nextBillingDate}</p>
            </div>
            {estimatedTotal > 0 && (
              <div>
                <span className="text-white/50 text-xs">Monthly total</span>
                <p className="text-white font-bold text-lg">
                  {formatAmount(estimatedTotal)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Past due alert */}
      {subscription.status === "past_due" && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <div className="shrink-0 h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center mt-0.5">
            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 mb-1">
              Payment Overdue
            </p>
            <p className="text-sm text-red-700">
              Your account has a past due balance. Please update your payment
              method to restore full access.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px" aria-label="Billing tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-navy-600 text-navy-700"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300",
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "plan" && (
          <PlanManager
            subscription={subscription}
            items={subscription.items}
            bundleConfigs={bundleConfigs}
            entitlements={entitlements}
            billingInterval={currentInterval}
            onBillingIntervalChange={setCurrentInterval}
          />
        )}
        {activeTab === "payments" && <PaymentMethodsTab />}
        {activeTab === "invoices" && <InvoicesTab />}
        {activeTab === "settings" && (
          <SettingsTab
            status={subscription.status}
            currentPeriodEnd={subscription.currentPeriodEnd}
            cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
            billingInterval={currentInterval}
            items={subscription.items}
          />
        )}
      </div>
    </div>
  );
}
