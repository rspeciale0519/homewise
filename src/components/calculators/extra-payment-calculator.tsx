"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { LoanTermSelect } from "./inputs/loan-term-select";
import { ComparisonBars } from "./results/comparison-bars";
import { ResultsTable } from "./results/results-table";
import {
  calculateMonthlyPI,
  calculatePayoffWithExtraPayment,
} from "@/lib/calculators/formulas";
import type { LoanTerm } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ExtraPaymentCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState<LoanTerm>(30);
  const [extraPayment, setExtraPayment] = useState(200);

  const minPayment = useMemo(
    () => calculateMonthlyPI(loanAmount, rate, term),
    [loanAmount, rate, term]
  );

  const totalPayment = minPayment + extraPayment;

  const result = useMemo(
    () =>
      calculatePayoffWithExtraPayment({
        loanAmount,
        annualRate: rate,
        termYears: term,
        newMonthlyPayment: totalPayment,
      }),
    [loanAmount, rate, term, totalPayment]
  );

  const hasSavings = extraPayment > 0 && result.monthsSaved > 0;

  const overviewRows = [
    { label: "Original Payment", value: fmt(minPayment) },
    { label: "New Payment", value: fmt(totalPayment) },
    { label: "Original Term", value: `${term} years` },
    { label: "New Payoff Time", value: formatDuration(result.newMonths) },
    { label: "Original Total Interest", value: fmt(result.originalTotalInterest) },
    { label: "New Total Interest", value: fmt(result.newTotalInterest) },
    { label: "Time Saved", value: formatDuration(result.monthsSaved), isSummary: true },
    { label: "Interest Saved", value: fmt(result.interestSaved), isSummary: true },
  ];

  const inputs = (
    <>
      <CurrencySlider
        label="Loan Amount"
        value={loanAmount}
        onChange={setLoanAmount}
        min={10000}
        max={2000000}
        step={5000}
        id="extra-amount"
      />
      <PercentSlider
        label="Interest Rate"
        value={rate}
        onChange={setRate}
        min={1}
        max={12}
        step={0.125}
        id="extra-rate"
      />
      <LoanTermSelect value={term} onChange={setTerm} id="extra-term" />

      {/* Min payment display */}
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-100">
        <span className="text-sm text-slate-500">Minimum Monthly Payment</span>
        <span className="text-sm font-semibold text-navy-700 tabular-nums">
          {fmt(minPayment)}/mo
        </span>
      </div>

      {/* Extra payment slider — the primary interactive element */}
      <CurrencySlider
        label="Extra Monthly Payment"
        value={extraPayment}
        onChange={setExtraPayment}
        min={0}
        max={Math.max(2000, Math.round(minPayment * 4))}
        step={25}
        id="extra-extra"
      />

      {/* Total payment display */}
      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-navy-50 border border-navy-100">
        <span className="text-sm font-medium text-navy-700">New Total Payment</span>
        <span className="text-sm font-bold text-navy-700 tabular-nums">
          {fmt(totalPayment)}/mo
        </span>
      </div>
    </>
  );

  const graphResults = (
    <>
      {/* Savings hero */}
      {hasSavings ? (
        <div className="text-center mb-6">
          <p className="text-xs text-navy-300 uppercase tracking-wider mb-1">
            By paying {fmt(extraPayment)} extra per month
          </p>
          <p className="font-serif text-2xl font-bold text-white mb-1">
            Pay off {formatDuration(result.monthsSaved)} early
          </p>
          <p className="text-emerald-400 font-semibold text-sm">
            Save {fmt(result.interestSaved)} in interest
          </p>
        </div>
      ) : (
        <div className="text-center mb-6">
          <p className="font-serif text-lg font-semibold text-white mb-1">
            Add extra payments to see your savings
          </p>
          <p className="text-xs text-navy-300">
            Use the slider to add a monthly amount above your minimum payment.
          </p>
        </div>
      )}

      <ComparisonBars
        originalMonths={result.originalMonths}
        newMonths={result.newMonths}
        originalLabel="Original"
        newLabel="With Extra Payments"
        originalCost={`${formatDuration(result.originalMonths)} — ${fmt(result.originalTotalCost)} total`}
        newCost={`${formatDuration(result.newMonths)} — ${fmt(result.newTotalCost)} total`}
        newBarColor={hasSavings ? "#10b981" : undefined}
      />
    </>
  );

  const overviewResults = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-4">
        Payoff Comparison
      </h3>
      <ResultsTable rows={overviewRows} />
    </>
  );

  return (
    <CalculatorShell
      title="Extra Payment Calculator"
      description="See how paying extra each month shortens your loan and saves interest."
      inputs={inputs}
      results={graphResults}
      overviewResults={overviewResults}
      showTabs
      instructions="Slide the extra payment amount to see how much time and money you can save. Even small extra payments can dramatically reduce your loan term and total interest paid."
    />
  );
}

function formatDuration(months: number): string {
  if (months <= 0) return "0 months";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} month${rem !== 1 ? "s" : ""}`;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} yr${years !== 1 ? "s" : ""}, ${rem} mo`;
}
