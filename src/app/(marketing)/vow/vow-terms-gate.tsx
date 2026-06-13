"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VOW_TERMS = [
  "The MLS data made available through this Virtual Office Website (VOW) is provided exclusively for your personal, non-commercial use to identify properties you may be interested in purchasing or leasing.",
  "Your access is provided under a broker-consumer relationship with Home Wise Realty Group and is subject to the broker's oversight, supervision, and accountability.",
  "You may not reproduce, redistribute, scrape, or use any automated means to access, copy, or harvest the MLS data. Any use or search of the data other than by a consumer seeking to purchase or lease real estate is prohibited.",
  "All data is sourced from Stellar MLS as distributed by MLS GRID, is deemed reliable but is not guaranteed, and should be independently verified for accuracy.",
  "Home Wise Realty Group may retain a record of your registration and data access for MLS compliance and audit purposes.",
];

export function VowTermsGate({ needsReaccept }: { needsReaccept: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleAccept = async () => {
    if (!checked || status === "submitting") return;
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/vow/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(data.error ?? "Could not record your acceptance. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="font-serif text-2xl font-semibold text-navy-700">
        VOW Terms of Use
      </h2>
      {needsReaccept && (
        <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Our VOW Terms of Use have been updated. Please review and accept the
          current terms to continue.
        </p>
      )}
      <p className="mt-3 text-sm text-slate-500">
        You must read and affirmatively accept these terms before searching VOW data.
      </p>
      <ol className="mt-5 space-y-3 list-decimal pl-5 text-sm leading-relaxed text-slate-600">
        {VOW_TERMS.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>

      <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-600"
        />
        <span className="text-sm text-slate-700">
          I have read and agree to the VOW Terms of Use and confirm a broker-consumer
          relationship with Home Wise Realty Group.
        </span>
      </label>

      {message && <p className="mt-3 text-sm text-crimson-600">{message}</p>}

      <button
        type="button"
        onClick={handleAccept}
        disabled={!checked || status === "submitting"}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-navy-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Recording…" : "I AGREE"}
      </button>
    </div>
  );
}
