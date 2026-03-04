"use client";

import { useState } from "react";

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

export function MortgageAdvisor() {
  const [income, setIncome] = useState("");
  const [debt, setDebt] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [homePrice, setHomePrice] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

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
      const data = (await res.json()) as AdvisorResult;
      setResult(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const scenarioColors = ["bg-blue-50 border-blue-200", "bg-green-50 border-green-200", "bg-amber-50 border-amber-200"];

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Annual Income</label>
            <input type="number" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="$75,000" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Debt Payments</label>
            <input type="number" value={debt} onChange={(e) => setDebt(e.target.value)} placeholder="$500" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Down Payment Available</label>
            <input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="$20,000" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Score Range</label>
            <select value={creditScore} onChange={(e) => setCreditScore(e.target.value)} className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600">
              <option value="">Select range</option>
              <option value="760+">Excellent (760+)</option>
              <option value="700-759">Good (700-759)</option>
              <option value="660-699">Fair (660-699)</option>
              <option value="620-659">Below Average (620-659)</option>
              <option value="below 620">Poor (below 620)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Home Price (optional)</label>
            <input type="number" value={homePrice} onChange={(e) => setHomePrice(e.target.value)} placeholder="$350,000" className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Details</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="First-time buyer, VA eligible, etc." className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600" />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || (!income && !description)}
          className="mt-4 w-full px-6 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Generating scenarios..." : "Get My Scenarios"}
        </button>
      </form>

      {result?.scenarios && (
        <div>
          {result.summary && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-700">{result.summary}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.scenarios.map((scenario, i) => (
              <div key={scenario.name} className={`rounded-xl border p-5 ${scenarioColors[i] ?? "bg-white border-slate-200"}`}>
                <h3 className="font-serif text-lg font-bold text-navy-700 mb-3">{scenario.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Loan Type</span><span className="font-medium">{scenario.loanType}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Home Price</span><span className="font-medium">${scenario.homePrice?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Down Payment</span><span className="font-medium">${scenario.downPayment?.toLocaleString()} ({scenario.downPaymentPct}%)</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Monthly Payment</span><span className="font-bold text-navy-700">${scenario.monthlyPayment?.toLocaleString()}/mo</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Term</span><span className="font-medium">{scenario.loanTerm}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Est. Rate</span><span className="font-medium">{scenario.interestRateEstimate}</span></div>
                </div>
                {scenario.considerations?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-1">Considerations:</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {scenario.considerations.map((c, j) => <li key={j}>• {c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 mb-3">Ready to take the next step?</p>
            <a href="/contact" className="inline-block px-6 py-3 bg-crimson-600 text-white font-semibold rounded-xl hover:bg-crimson-700 transition-colors">
              Get Pre-Approved
            </a>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-6">
        For educational purposes only. Not financial advice. Consult a licensed mortgage professional.
      </p>
    </div>
  );
}
