"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RecordPaymentForm, ExtendGracePeriodForm } from "./agent-billing-actions";

interface SubscriptionItem {
  id: string;
  productType: string;
  productName: string;
  stripePriceId: string;
  quantity: number;
}

interface AgentSubscription {
  id: string;
  status: string;
  stripeSubscriptionId: string;
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

interface GracePeriodOverride {
  id: string;
  extendedUntil: string;
  reason: string;
  grantedBy: string;
  createdAt: string;
}

interface StripePaymentMethod {
  id: string;
  type: string;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number };
}

interface AgentDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  stripeCustomer: { stripeCustomerId: string } | null;
  subscription: AgentSubscription | null;
  paymentRecords: PaymentRecord[];
  gracePeriodOverrides: GracePeriodOverride[];
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  trialing: { bg: "bg-amber-50", text: "text-amber-700", label: "Trialing" },
  past_due: { bg: "bg-red-50", text: "text-red-700", label: "Past Due" },
  canceled: { bg: "bg-slate-100", text: "text-slate-500", label: "Canceled" },
  none: { bg: "bg-slate-50", text: "text-slate-400", label: "No Subscription" },
};

type ActiveAction = "payment" | "grace-period" | null;

export function AgentBillingDetail({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<StripePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/agents/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setPaymentMethods(data.paymentMethods ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleActionSuccess = () => {
    setActiveAction(null);
    fetchAgent();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return <p className="text-center py-12 text-slate-400">Agent not found.</p>;
  }

  const sub = agent.subscription;
  const fallbackBadge = { bg: "bg-slate-50", text: "text-slate-400", label: "No Subscription" };
  const badge = statusBadge[sub?.status ?? "none"] ?? fallbackBadge;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy-700">
            {agent.firstName} {agent.lastName}
          </h2>
          <p className="text-sm text-slate-500">{agent.email ?? "No email"}</p>
        </div>
        <span className={cn("text-xs font-semibold uppercase px-2.5 py-1 rounded-full", badge.bg, badge.text)}>
          {badge.label}
        </span>
      </div>

      {/* Subscription Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h3 className="font-semibold text-navy-700 text-sm mb-4">Subscription</h3>
        {sub ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-1">Period</p>
              <p className="text-navy-700">
                {new Date(sub.currentPeriodStart).toLocaleDateString()} — {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
            {sub.trialEnd && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Trial Ends</p>
                <p className="text-navy-700">{new Date(sub.trialEnd).toLocaleDateString()}</p>
              </div>
            )}
            {sub.cancelAtPeriodEnd && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                  Cancels at period end
                </p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-400 mb-2">Active Bundles</p>
              <div className="flex flex-wrap gap-1">
                {sub.items.map((item) => (
                  <span
                    key={item.id}
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-navy-50 text-navy-600"
                  >
                    {item.productName}
                  </span>
                ))}
                {sub.items.length === 0 && <span className="text-xs text-slate-400">None</span>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No active subscription.</p>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h3 className="font-semibold text-navy-700 text-sm mb-4">Actions</h3>
        {activeAction === null ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveAction("payment")}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-navy-600 text-white hover:bg-navy-700 transition-colors"
            >
              Record Offline Payment
            </button>
            <button
              onClick={() => setActiveAction("grace-period")}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Extend Grace Period
            </button>
            {agent.stripeCustomer && (
              <Link
                href={`https://dashboard.stripe.com/customers/${agent.stripeCustomer.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                Manage in Stripe
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </Link>
            )}
          </div>
        ) : activeAction === "payment" ? (
          <RecordPaymentForm agentId={agentId} onSuccess={handleActionSuccess} onCancel={() => setActiveAction(null)} />
        ) : (
          <ExtendGracePeriodForm agentId={agentId} onSuccess={handleActionSuccess} onCancel={() => setActiveAction(null)} />
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h3 className="font-semibold text-navy-700 text-sm mb-4">Payment Methods</h3>
        {paymentMethods.length === 0 ? (
          <p className="text-sm text-slate-400">No payment methods on file.</p>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="h-8 w-8 rounded bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                  {pm.card?.brand.slice(0, 4) ?? pm.type}
                </div>
                <div className="text-sm">
                  {pm.card ? (
                    <p className="text-navy-700">
                      <span className="capitalize">{pm.card.brand}</span> ending in {pm.card.last4}
                      <span className="text-slate-400 ml-2">
                        {pm.card.exp_month}/{pm.card.exp_year}
                      </span>
                    </p>
                  ) : (
                    <p className="text-navy-700 capitalize">{pm.type}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-navy-700 text-sm">Payment History</h3>
        </div>
        {agent.paymentRecords.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">No payment records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agent.paymentRecords.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-slate-500">{new Date(pr.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 font-medium text-navy-700">
                      ${(pr.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-slate-500 capitalize">{pr.paymentType}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
                        pr.status === "succeeded" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs max-w-48 truncate">{pr.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grace Period Overrides */}
      {agent.gracePeriodOverrides.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-navy-700 text-sm">Grace Period Overrides</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Granted</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Extended Until</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agent.gracePeriodOverrides.map((gpo) => (
                  <tr key={gpo.id}>
                    <td className="px-5 py-3 text-slate-500">{new Date(gpo.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-navy-700">{new Date(gpo.extendedUntil).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-64 truncate">{gpo.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
