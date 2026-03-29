"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RecordPaymentFormProps {
  agentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecordPaymentForm({ agentId, onSuccess, onCancel }: RecordPaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "check">("check");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents < 100) {
      setError("Amount must be at least $1.00");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/billing/agents/${agentId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountCents, paymentType, notes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to record payment");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Amount (USD)</label>
        <input
          type="number"
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Payment Type</label>
        <div className="flex gap-2">
          {(["check", "cash"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPaymentType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                paymentType === t
                  ? "bg-navy-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300 resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving}>Record Payment</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

interface ExtendGracePeriodFormProps {
  agentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExtendGracePeriodForm({ agentId, onSuccess, onCancel }: ExtendGracePeriodFormProps) {
  const [extendedUntil, setExtendedUntil] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!extendedUntil || !reason.trim()) {
      setError("Both date and reason are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/billing/agents/${agentId}/grace-period`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extendedUntil: new Date(extendedUntil).toISOString(),
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to extend grace period");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Extend Until</label>
        <input
          type="date"
          value={extendedUntil}
          onChange={(e) => setExtendedUntil(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          required
          placeholder="Reason for extending grace period..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300 resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving}>Extend Grace Period</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
