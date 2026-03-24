"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";

interface Scenario {
  name: string;
  loanType: string;
  homePrice: number;
  downPayment: number;
  downPaymentPct: number;
  monthlyPayment: number;
  loanTerm: string;
  interestRateEstimate: string;
  considerations: string[];
}

interface AdvisorResult {
  scenarios: Scenario[];
  summary: string;
}

const SCENARIO_STYLES = [
  { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", accent: "text-blue-700" },
  { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", accent: "text-green-700" },
  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", accent: "text-amber-700" },
];

export function MortgageAdvisor() {
  const [income, setIncome] = useState("");
  const [debt, setDebt] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [homePrice, setHomePrice] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading } = useSupabase();
  const [gated, setGated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    // Gate: unauthenticated users see an inline signup prompt instead
    if (!user) {
      setGated(true);
      return;
    }

    setIsSubmitting(true);
    setResult(null);
    setError(null);
    setGated(false);

    try {
      const res = await fetch("/api/ai/mortgage-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annualIncome: income ? Number(income) : undefined,
          monthlyDebt: debt ? Number(debt) : undefined,
          downPayment: downPayment ? Number(downPayment) : undefined,
          creditScore: creditScore || undefined,
          homePrice: homePrice ? Number(homePrice) : undefined,
          description: description || undefined,
        }),
      });
      if (!res.ok) {
        setError("Something went wrong generating your scenarios. Please try again.");
        return;
      }
      const data = (await res.json()) as AdvisorResult;
      setResult(data);
    } catch {
      setError("Something went wrong generating your scenarios. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div>
      {!loading && !user && (
        <div className="flex items-center gap-3 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3 mb-5 text-sm">
          <svg className="h-4 w-4 text-navy-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-slate-600">
            A free account is required to generate AI scenarios.{" "}
            <Link href="/register" className="font-medium text-navy-700 underline underline-offset-2 hover:text-crimson-600 transition-colors">
              Sign up free
            </Link>{" "}
            — takes less than a minute.
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Annual Income" value={income} onChange={(v) => { setIncome(v); setGated(false); }} placeholder="75000" prefix="$" type="number" />
          <InputField label="Monthly Debt Payments" value={debt} onChange={(v) => { setDebt(v); setGated(false); }} placeholder="500" prefix="$" type="number" />
          <InputField label="Down Payment Available" value={downPayment} onChange={(v) => { setDownPayment(v); setGated(false); }} placeholder="20000" prefix="$" type="number" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Credit Score Range</label>
            <select
              value={creditScore}
              onChange={(e) => { setCreditScore(e.target.value); setGated(false); }}
              className="w-full h-11 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 transition-colors"
            >
              <option value="">Select range</option>
              <option value="760+">Excellent (760+)</option>
              <option value="700-759">Good (700-759)</option>
              <option value="660-699">Fair (660-699)</option>
              <option value="620-659">Below Average (620-659)</option>
              <option value="below 620">Poor (below 620)</option>
            </select>
          </div>
          <InputField label="Target Home Price (optional)" value={homePrice} onChange={(v) => { setHomePrice(v); setGated(false); }} placeholder="350000" prefix="$" type="number" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Details</label>
            <input
              value={description}
              onChange={(e) => { setDescription(e.target.value); setGated(false); }}
              placeholder="First-time buyer, VA eligible, etc."
              className="w-full h-11 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 transition-colors"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || (!income && !description)}
          className="mt-5 w-full px-6 py-3.5 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-all disabled:opacity-50 active:scale-[0.99]"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating scenarios...
            </span>
          ) : "Get My Scenarios"}
        </button>
        {error && (
          <p className="mt-3 text-sm text-crimson-600 text-center">{error}</p>
        )}
      </form>

      {gated && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-navy-50 mb-4">
            <svg className="h-6 w-6 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="font-serif text-xl font-bold text-navy-700 mb-2">
            Your scenarios are ready to generate
          </h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
            Create a free account to unlock your personalized AI mortgage scenarios — it takes less
            than a minute.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors text-sm"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-white text-navy-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
            >
              Log In
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Your details above are saved — just sign in and submit again.
          </p>
        </div>
      )}

      {result?.scenarios && (
        <div>
          {result.summary && (
            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 mb-6 border border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.scenarios.map((scenario, i) => {
              const style = SCENARIO_STYLES[i] ?? SCENARIO_STYLES[0]!;
              return (
                <div key={scenario.name} className={`rounded-xl border ${style.border} ${style.bg} p-4 sm:p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badge}`}>
                      Scenario {i + 1}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-navy-700 mb-4">{scenario.name}</h3>
                  <div className="space-y-2.5 text-sm">
                    <DetailRow label="Loan Type" value={scenario.loanType} />
                    <DetailRow label="Home Price" value={`$${scenario.homePrice?.toLocaleString()}`} />
                    <DetailRow label="Down Payment" value={`$${scenario.downPayment?.toLocaleString()} (${scenario.downPaymentPct}%)`} />
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                      <span className="text-slate-500">Monthly Payment</span>
                      <span className="text-lg font-bold text-navy-700">${scenario.monthlyPayment?.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span></span>
                    </div>
                    <DetailRow label="Term" value={scenario.loanTerm} />
                    <DetailRow label="Est. Rate" value={scenario.interestRateEstimate} />
                  </div>
                  {scenario.considerations?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/50">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Considerations</p>
                      <ul className="text-xs text-slate-600 space-y-1.5">
                        {scenario.considerations.map((c, j) => (
                          <li key={j} className="flex gap-2">
                            <span className={`mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full ${style.accent === "text-blue-700" ? "bg-blue-400" : style.accent === "text-green-700" ? "bg-green-400" : "bg-amber-400"}`} />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 mb-3">Ready to take the next step?</p>
            <a href="/contact" className="inline-block px-6 py-3 bg-crimson-600 text-white font-semibold rounded-xl hover:bg-crimson-700 transition-colors">
              Get Pre-Approved
            </a>
          </div>
        </div>
      )}

      {isSubmitting && !result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-3">
              <div className="h-3 w-16 bg-slate-200 rounded-full" />
              <div className="h-4 w-3/4 bg-slate-200 rounded-full" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-slate-100 rounded-full" />
                <div className="h-3 w-5/6 bg-slate-100 rounded-full" />
                <div className="h-3 w-4/6 bg-slate-100 rounded-full" />
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="h-6 w-1/2 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-6">
        For educational purposes only. Not financial advice. Consult a licensed mortgage professional.
      </p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  prefix?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-11 ${prefix ? "pl-7" : "pl-3"} pr-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 transition-colors`}
        />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-navy-700">{value}</span>
    </div>
  );
}
