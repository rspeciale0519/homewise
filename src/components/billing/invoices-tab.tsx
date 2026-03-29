"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface InvoiceLine {
  id: string;
  description: string | null;
  amount: number;
  quantity: number | null;
}

interface Invoice {
  id: string;
  number: string | null;
  amount_due: number;
  amount_paid: number;
  status: string | null;
  created: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  lines: InvoiceLine[];
}

interface UpcomingInvoice {
  amount_due: number;
  currency: string;
  next_payment_attempt: number | null;
  lines: InvoiceLine[];
}

interface InvoicesState {
  invoices: Invoice[];
  upcoming: UpcomingInvoice | null;
  loading: boolean;
  error: string | null;
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status: string | null) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
    open: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
    draft: { bg: "bg-slate-100", text: "text-slate-500", label: "Draft" },
    uncollectible: {
      bg: "bg-red-50",
      text: "text-red-700",
      label: "Failed",
    },
    void: { bg: "bg-slate-100", text: "text-slate-400", label: "Void" },
  };
  const s = status ?? "draft";
  const badge = config[s] ?? {
    bg: "bg-slate-100",
    text: "text-slate-500",
    label: s,
  };
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full whitespace-nowrap",
        badge.bg,
        badge.text,
      )}
    >
      {badge.label}
    </span>
  );
}

export function InvoicesTab() {
  const [state, setState] = useState<InvoicesState>({
    invoices: [],
    upcoming: null,
    loading: true,
    error: null,
  });
  const [retryLoading, setRetryLoading] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/billing/invoices");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load invoices");
      }
      const data = await res.json();
      setState({
        invoices: data.invoices ?? [],
        upcoming: data.upcomingInvoice ?? null,
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
    fetchInvoices();
  }, [fetchInvoices]);

  const handleRetry = async (invoiceId: string) => {
    setRetryLoading(invoiceId);
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}/pay`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Retry failed");
      }
      await fetchInvoices();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Retry failed",
      }));
    } finally {
      setRetryLoading(null);
    }
  };

  if (state.loading) {
    return (
      <div className="py-12 text-center">
        <div className="h-6 w-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading invoices...</p>
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

      {/* Upcoming invoice */}
      {state.upcoming && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-navy-700">
              Upcoming Invoice
            </h3>
            <span className="text-lg font-bold text-navy-700">
              {formatAmount(state.upcoming.amount_due)}
            </span>
          </div>
          <div className="px-5 py-4">
            {state.upcoming.next_payment_attempt && (
              <p className="text-xs text-slate-400 mb-3">
                Next charge:{" "}
                {formatDate(state.upcoming.next_payment_attempt)}
              </p>
            )}
            <div className="space-y-2">
              {state.upcoming.lines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">
                    {line.description ?? "Line item"}
                  </span>
                  <span className="font-medium text-navy-700">
                    {formatAmount(line.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoice history */}
      {state.invoices.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-400">No invoices yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(inv.created)}
                    </td>
                    <td className="px-5 py-3 text-navy-700 font-medium whitespace-nowrap">
                      {inv.number ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-medium text-navy-700 whitespace-nowrap">
                      {formatAmount(inv.amount_due)}
                    </td>
                    <td className="px-5 py-3">{statusBadge(inv.status)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-navy-600 hover:text-navy-700 transition-colors"
                          >
                            Download PDF
                          </a>
                        )}
                        {inv.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleRetry(inv.id)}
                            disabled={retryLoading === inv.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                          >
                            {retryLoading === inv.id
                              ? "Retrying..."
                              : "Retry Payment"}
                          </button>
                        )}
                      </div>
                    </td>
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
