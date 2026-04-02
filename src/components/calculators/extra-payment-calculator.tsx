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

  const minPayment = useMemo(
    () => calculateMonthlyPI(loanAmount, rate, term),
    [loanAmount, rate, term]
  );

  const [payment, setPayment] = useState(632.07);

  const effectivePayment = Math.max(payment, minPayment);

  const result = useMemo(
    () =>
      calculatePayoffWithExtraPayment({
        loanAmount,
        annualRate: rate,
        termYears: term,
        newMonthlyPayment: effectivePayment,
      }),
    [loanAmount, rate, term, effectivePayment]
  );

  const overviewRows = [
    { label: "Original Term", value: `${term} years` },
    { label: "Original Total Cost", value: fmt(result.originalTotalCost) },
    { label: "New Payoff Time", value: formatDuration(result.newMonths) },
    { label: "New Total Cost", value: fmt(result.newTotalCost) },
    { label: "Months Saved", value: `${result.monthsSaved}` },
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
      <CurrencySlider
        label="Monthly Payment Considered"
        value={payment}
        onChange={setPayment}
        min={Math.round(minPayment)}
        max={Math.round(minPayment * 5)}
        step={50}
        id="extra-payment"
      />
      <LoanTermSelect value={term} onChange={setTerm} id="extra-term" />
    </>
  );

  const graphResults = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-6">Payoff Results</h3>
      <ComparisonBars
        originalMonths={result.originalMonths}
        newMonths={result.newMonths}
        originalCost={`Original: ${fmt(result.originalTotalCost)}`}
        newCost={`With New Payment: ${fmt(result.newTotalCost)}`}
      />
    </>
  );

  const overviewResults = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-4">Payoff Overview</h3>
      <ResultsTable rows={overviewRows} />
    </>
  );

  return (
    <CalculatorShell
      title="How long will my mortgage last if I pay more?"
      description="See how extra payments shorten your loan and save interest."
      inputs={inputs}
      results={graphResults}
      overviewResults={overviewResults}
      showTabs
      instructions="This calculator figures the length of your mortgage depending on your monthly payment. By paying more than your mortgage payment every month, you can decrease the length of your loan. Input an amount higher than your mortgage payment and determine when your mortgage will be paid off based on the higher payment."
    />
  );
}

function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} month${rem !== 1 ? "s" : ""}`;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""}, ${rem} month${rem !== 1 ? "s" : ""}`;
}
