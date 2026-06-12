"use client";

import { useState } from "react";
import type { OpenHouseSlot } from "@/providers/property-provider";

interface OpenHouseRsvpFormProps {
  listingId: string;
  slots: OpenHouseSlot[];
}

export function OpenHouseRsvpForm({ listingId, slots }: OpenHouseRsvpFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slotDate, setSlotDate] = useState(slots[0]?.date ?? "");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <p className="mt-3 text-sm text-emerald-600 font-medium">
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
    <form onSubmit={submit} className="mt-3 space-y-2">
      {slots.length > 1 && (
        <select value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className={inputCls}>
          {slots.map((slot) => (
            <option key={slot.date} value={slot.date}>
              {slot.date}
            </option>
          ))}
        </select>
      )}
      <input type="text" required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      <input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
      {state === "error" && (
        <p className="text-xs text-crimson-600">Something went wrong — please try again.</p>
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
