"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { LoanTermSelect } from "./inputs/loan-term-select";
import { ResultHero } from "./results/result-hero";
import { ResultsTable } from "./results/results-table";
import { calculateAPR } from "@/lib/calculators/formulas";
import { InlineInput } from "./inputs/currency-slider";
import type { LoanTerm } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function APRCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState<LoanTerm>(30);
  const [origFee, setOrigFee] = useState(1);
  const [points, setPoints] = useState(2);
  const [otherFees, setOtherFees] = useState(0);

  const result = useMemo(
    () =>
      calculateAPR({
        loanAmount,
        annualRate: rate,
        termYears: term,
        originationFeePercent: origFee,
        points,
        otherFees,
      }),
    [loanAmount, rate, term, origFee, points, otherFees]
  );

  const rows = [
    { label: "Loan Amount", value: fmt(loanAmount) },
    { label: "Interest Rate", value: `${rate}%` },
    { label: "Origination Fee", value: fmt(result.originationFeeAmount) },
    { label: "Discount Points", value: fmt(result.discountPointsAmount) },
    { label: "Prepaid Interest", value: fmt(result.prepaidInterest) },
    { label: "Other Loan Fees", value: fmt(otherFees) },
    { label: "Total Loan Fees", value: fmt(result.totalFees) },
    { label: "Monthly Payment", value: fmt(result.monthlyPayment) },
    { label: "Annual Percentage Rate (APR)", value: `${result.apr.toFixed(2)}%`, isSummary: true },
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
        id="apr-amount"
      />
      <PercentSlider
        label="Interest Rate"
        value={rate}
        onChange={setRate}
        min={1}
        max={12}
        step={0.125}
        id="apr-rate"
      />
      <LoanTermSelect value={term} onChange={setTerm} id="apr-term" />
      <PercentSlider
        label="Origination Fee"
        value={origFee}
        onChange={setOrigFee}
        min={0}
        max={5}
        step={0.25}
        id="apr-orig"
        decimals={2}
      />
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="apr-points" className="text-sm font-medium text-navy-700">
            Points
          </label>
          <InlineInput
            id="apr-points"
            value={points}
            onChange={setPoints}
            min={0}
            max={10}
            format={(v) => String(v)}
            inputWidth="w-[4rem]"
          />
        </div>
      </div>
      <CurrencySlider
        label="Other Loan Fees"
        value={otherFees}
        onChange={setOtherFees}
        min={0}
        max={10000}
        step={100}
        id="apr-fees"
      />
    </>
  );

  const results = (
    <>
      <ResultHero label="APR" value={`${result.apr.toFixed(2)}%`} />
      <ResultsTable rows={rows} />
    </>
  );

  return (
    <CalculatorShell
      title="What is the APR for this loan?"
      description="Calculate the true Annual Percentage Rate including all fees and points."
      inputs={inputs}
      results={results}
      instructions="This calculator estimates the Annual Percentage Rate (APR) for a given loan based on its parameters. In addition to its interest rate, we must also take into account the loan's origination fee, discount points, and all other loan fees in order to calculate the APR of the loan. This calculator assumes 15 days of prepaid interest."
    />
  );
}
