"use client";

import { useId, useState } from "react";
import type { OpenHouseSlot } from "@/providers/property-provider";

interface OpenHouseRsvpFormProps {
  listingId: string;
  slots: OpenHouseSlot[];
}

export function OpenHouseRsvpForm({ listingId, slots }: OpenHouseRsvpFormProps) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slotDate, setSlotDate] = useState(slots[0]?.date ?? "");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <p className="mt-3 text-sm text-emerald-600 font-medium" role="status" aria-live="polite">
        You&apos;re on the list! The listing agent has been notified.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full px-4 py-2 rounded-xl border border-navy-200 text-navy-700 text-sm font-semibold hover:bg-navy-50 transition-colors"
      >
        I&apos;ll Be There — RSVP
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    try {
      const res = await fetch("/api/open-house-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, name, email, phone, slotDate }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200";

  return (
    <form onSubmit={submit} className="mt-3 space-y-3" aria-busy={state === "saving"}>
      {slots.length > 1 && (
        <div>
          <label htmlFor={`${formId}-date`} className="block text-xs font-medium text-slate-600 mb-1">Open house date</label>
          <select id={`${formId}-date`} value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className={inputCls}>
            {slots.map((slot) => (
              <option key={slot.date} value={slot.date}>
                {slot.date}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor={`${formId}-name`} className="block text-xs font-medium text-slate-600 mb-1">Your name</label>
        <input id={`${formId}-name`} type="text" autoComplete="name" required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${formId}-email`} className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input id={`${formId}-email`} type="email" autoComplete="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${formId}-phone`} className="block text-xs font-medium text-slate-600 mb-1">Phone (optional)</label>
        <input id={`${formId}-phone`} type="tel" autoComplete="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
      </div>
      {state === "error" && (
        <p className="text-xs text-crimson-600" role="alert">Something went wrong — please try again.</p>
      )}
      <button
        type="submit"
        disabled={state === "saving"}
        className="w-full px-4 py-2 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 transition-colors disabled:opacity-50"
      >
        {state === "saving" ? "Sending..." : "Confirm RSVP"}
      </button>
    </form>
  );
}
