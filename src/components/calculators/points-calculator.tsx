"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { LoanTermSelect } from "./inputs/loan-term-select";
import { ResultHero } from "./results/result-hero";
import { ResultsTable } from "./results/results-table";
import { calculatePointsBreakeven } from "@/lib/calculators/formulas";
import { DEFAULT_SAVINGS_RATE } from "@/lib/calculators/constants";
import type { LoanTerm } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PointsCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [rateWithout, setRateWithout] = useState(6.5);
  const [rateWith, setRateWith] = useState(7.5);
  const [pointsPercent, setPointsPercent] = useState(2);
  const [term, setTerm] = useState<LoanTerm>(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savingsRate, setSavingsRate] = useState(DEFAULT_SAVINGS_RATE);

  const result = useMemo(
    () =>
      calculatePointsBreakeven({
        loanAmount,
        rateWithoutPoints: rateWithout,
        rateWithPoints: rateWith,
        pointsPercent,
        termYears: term,
        savingsRate,
      }),
    [loanAmount, rateWithout, rateWith, pointsPercent, term, savingsRate]
  );

  const breakevenLabel =
    result.breakevenMonths < 0
      ? "Never — points don't save money"
      : `${result.breakevenYears} year${result.breakevenYears !== 1 ? "s" : ""}, ${result.breakevenRemainingMonths} month${result.breakevenRemainingMonths !== 1 ? "s" : ""}`;

  const rows = [
    { label: "Monthly Payment without Points", value: fmt(result.paymentWithoutPoints) },
    { label: "Monthly Payment with Points", value: fmt(result.paymentWithPoints) },
    { label: "Monthly Savings", value: fmt(result.monthlySavings) },
    { label: "Cost of Points", value: fmt(result.costOfPoints) },
    { label: "Saving Rate of Return", value: `${result.savingsRateOfReturn}%` },
    { label: "Monthly Income from Investment", value: fmt(result.monthlyInvestmentIncome) },
    { label: "True Monthly Savings", value: fmt(result.trueMonthlySavings), isSummary: true },
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
        id="pts-amount"
      />
      <PercentSlider
        label="Interest Rate"
        value={rateWithout}
        onChange={setRateWithout}
        min={1}
        max={12}
        step={0.125}
        id="pts-rate-without"
      />
      <PercentSlider
        label="Interest Rate With Points"
        value={rateWith}
        onChange={setRateWith}
        min={1}
        max={12}
        step={0.125}
        id="pts-rate-with"
      />
      <PercentSlider
        label="Points"
        value={pointsPercent}
        onChange={setPointsPercent}
        min={0}
        max={5}
        step={0.25}
        id="pts-percent"
        decimals={2}
        secondaryValue={`($${(loanAmount * pointsPercent / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
      />
      <LoanTermSelect value={term} onChange={setTerm} id="pts-term" />
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-navy-600 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-45" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Advanced
      </button>
      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <PercentSlider
            label="Savings Rate of Return"
            value={savingsRate}
            onChange={setSavingsRate}
            min={0}
            max={10}
            step={0.5}
            id="pts-savings"
            decimals={1}
          />
        </div>
      )}
    </>
  );

  const results = (
    <>
      <ResultHero label="Breakeven Point" value={breakevenLabel} />
      <ResultsTable rows={rows} />
    </>
  );

  return (
    <CalculatorShell
      title="Should I pay points for a lower interest rate?"
      description="Find the breakeven point for paying discount points."
      inputs={inputs}
      results={results}
      instructions="This calculator figures the breakeven point for the points to be paid. This is the time it would take for the savings of lower monthly payments to make up for the upfront point(s) paid. It would then depend on how long you intend to stay at your home or what your monthly payment requirements are in order to decide whether or not to pay the point(s)."
    />
  );
}
