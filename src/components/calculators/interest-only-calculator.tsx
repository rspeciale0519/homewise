"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { ResultHero } from "./results/result-hero";
import { calculateInterestOnly } from "@/lib/calculators/formulas";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function InterestOnlyCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [rate, setRate] = useState(6.5);

  const payment = useMemo(
    () => calculateInterestOnly(loanAmount, rate),
    [loanAmount, rate]
  );

  const inputs = (
    <>
      <CurrencySlider
        label="Loan Amount"
        value={loanAmount}
        onChange={setLoanAmount}
        min={10000}
        max={2000000}
        step={5000}
        id="io-amount"
      />
      <PercentSlider
        label="Interest Rate"
        value={rate}
        onChange={setRate}
        min={1}
        max={12}
        step={0.125}
        id="io-rate"
      />
    </>
  );

  const results = (
    <ResultHero
      label="Interest Only Payment"
      value={fmt(payment)}
      sublabel="per month"
    />
  );

  return (
    <CalculatorShell
      title="Interest Only Loan"
      description="Calculate your interest-only monthly payment."
      inputs={inputs}
      results={results}
      instructions="This calculator will show an interest only payment amount based on your loan parameters."
    />
  );
}
