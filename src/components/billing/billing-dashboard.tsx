"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SubscriptionStatus } from "./subscription-status";

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

interface BillingDashboardProps {
  subscription: Subscription | null;
  paymentRecords: PaymentRecord[];
  hasStripeCustomer: boolean;
}

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function paymentTypeLabel(type: string) {
  const map: Record<string, string> = {
    card: "Card",
    ach: "ACH",
    cash: "Cash",
    check: "Check",
    stripe: "Card",
  };
  return map[type] ?? type;
}

export function BillingDashboard({
  subscription,
  paymentRecords,
  hasStripeCustomer,
}: BillingDashboardProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPortalError(data.error ?? "Failed to open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setPortalError("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const isPastDue = subscription?.status === "past_due";
  const isTrialing = subscription?.status === "trialing";

  const estimatedMonthlyAmount = subscription?.items.reduce<number>(() => 0, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Past due alert */}
      {isPastDue && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <div className="shrink-0 h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center mt-0.5">
            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 mb-1">Payment Overdue</p>
            <p className="text-sm text-red-700 mb-3">
              Your account has a past due balance. Please update your payment method to restore full access.
            </p>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {portalLoading ? "Opening..." : "Update Payment Method"}
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Current Plan */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-navy-700">Current Plan</h2>
        </div>
        <div className="px-5 sm:px-6 py-5">
          {subscription ? (
            <SubscriptionStatus
              status={subscription.status}
              currentPeriodStart={subscription.currentPeriodStart}
              currentPeriodEnd={subscription.currentPeriodEnd}
              cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
              trialEnd={subscription.trialEnd}
              items={subscription.items}
            />
          ) : (
            <div className="flex flex-col items-start gap-4">
              <div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-slate-50 text-slate-400">
                  No Subscription
                </span>
              </div>
              <p className="text-sm text-slate-500">
                You don&apos;t have an active membership yet. Set up your membership to get started.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 transition-colors"
              >
                Set up your membership
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Billing Actions */}
      {(subscription || hasStripeCustomer) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
            <h2 className="font-serif text-base font-semibold text-navy-700">Billing Actions</h2>
          </div>
          <div className="px-5 sm:px-6 py-5 flex flex-wrap gap-3">
            {hasStripeCustomer && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-60 transition-colors"
              >
                {portalLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    Manage Subscription
                  </>
                )}
              </button>
            )}
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:border-navy-300 hover:text-navy-700 hover:bg-slate-50 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              Upgrade Plan
            </Link>
          </div>
          {portalError && (
            <div className="px-5 sm:px-6 pb-4">
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{portalError}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Upcoming Invoice */}
      {subscription && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
            <h2 className="font-serif text-base font-semibold text-navy-700">Upcoming Invoice</h2>
          </div>
          <div className="px-5 sm:px-6 py-5">
            {isTrialing && subscription.trialEnd ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">First billing date</p>
                  <p className="text-navy-700 font-medium">
                    {new Date(subscription.trialEnd).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Note</p>
                  <p className="text-slate-500">Billing begins after trial ends</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Next billing date</p>
                  <p className="text-navy-700 font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {estimatedMonthlyAmount > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Estimated amount</p>
                    <p className="text-navy-700 font-medium">
                      {formatAmount(estimatedMonthlyAmount, "usd")}
                    </p>
                  </div>
                )}
                {subscription.cancelAtPeriodEnd && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg inline-block">
                      Subscription cancels at end of current period — no future invoice will be generated
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 4: Payment History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-navy-700">Payment History</h2>
        </div>

        {paymentRecords.length === 0 ? (
          <div className="px-5 sm:px-6 py-10 text-center">
            <p className="text-sm text-slate-400">No payment records yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paymentRecords.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(pr.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 font-medium text-navy-700 whitespace-nowrap">
                        {formatAmount(pr.amount, pr.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full whitespace-nowrap",
                            pr.status === "succeeded"
                              ? "bg-emerald-50 text-emerald-700"
                              : pr.status === "pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {paymentTypeLabel(pr.paymentType)}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs max-w-48 truncate">
                        {pr.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
