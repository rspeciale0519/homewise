"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  us_bank_account?: {
    bank_name: string;
    last4: string;
    account_type: string;
  };
}

interface PaymentMethodsState {
  methods: StripePaymentMethod[];
  defaultId: string | null;
  loading: boolean;
  error: string | null;
}

function cardBrandDisplay(brand: string): string {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return map[brand] ?? brand;
}

function AddPaymentMethodForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setFormError(null);

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setFormError(result.error.message ?? "Failed to add payment method");
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {formError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {formError}
        </p>
      )}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving..." : "Save Payment Method"}
        </button>
      </div>
    </form>
  );
}

export function PaymentMethodsTab() {
  const [state, setState] = useState<PaymentMethodsState>({
    methods: [],
    defaultId: null,
    loading: true,
    error: null,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/billing/payment-methods");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load payment methods");
      }
      const data = await res.json();
      setState({
        methods: data.paymentMethods ?? [],
        defaultId: data.defaultPaymentMethodId ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleAddClick = async () => {
    try {
      const res = await fetch("/api/billing/setup-intent", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to initialize");
      }
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setShowAddForm(true);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  };

  const handleSetDefault = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/billing/payment-methods/${id}/default`, {
        method: "PUT",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to set default");
      }
      await fetchMethods();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/billing/payment-methods/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove");
      }
      await fetchMethods();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setClientSecret(null);
    fetchMethods();
  };

  if (state.loading) {
    return (
      <div className="py-12 text-center">
        <div className="h-6 w-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading payment methods...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Payment methods list */}
      {state.methods.length === 0 && !showAddForm ? (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-400 mb-4">
            No payment methods on file.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.methods.map((method) => {
            const isDefault = method.id === state.defaultId;
            return (
              <div
                key={method.id}
                className={cn(
                  "flex items-center justify-between px-5 py-4 rounded-xl border transition-colors",
                  isDefault
                    ? "border-navy-200 bg-navy-50/30"
                    : "border-slate-200 bg-white",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    {method.type === "card" ? (
                      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    {method.card && (
                      <p className="text-sm font-medium text-navy-700">
                        {cardBrandDisplay(method.card.brand)} ending in{" "}
                        {method.card.last4}
                        <span className="text-slate-400 ml-2">
                          {String(method.card.exp_month).padStart(2, "0")}/
                          {method.card.exp_year}
                        </span>
                      </p>
                    )}
                    {method.us_bank_account && (
                      <p className="text-sm font-medium text-navy-700">
                        {method.us_bank_account.bank_name} ending in{" "}
                        {method.us_bank_account.last4}
                      </p>
                    )}
                    {isDefault && (
                      <span className="inline-flex items-center rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold text-navy-700 uppercase tracking-wide mt-1">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={actionLoading === method.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(method.id)}
                    disabled={actionLoading === method.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showAddForm && clientSecret ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-serif text-base font-semibold text-navy-700 mb-4">
            Add Payment Method
          </h3>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <AddPaymentMethodForm
              onSuccess={handleAddSuccess}
              onCancel={() => {
                setShowAddForm(false);
                setClientSecret(null);
              }}
            />
          </Elements>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Payment Method
        </button>
      )}
    </div>
  );
}
