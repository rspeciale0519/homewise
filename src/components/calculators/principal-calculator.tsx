"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { MonthSlider } from "./inputs/month-slider";
import { LoanTermSelect } from "./inputs/loan-term-select";
import { PaymentDonut } from "./results/payment-donut";
import { PaymentBreakdown } from "./results/payment-breakdown";
import { ResultsTable } from "./results/results-table";
import { calculatePrincipalBalance } from "@/lib/calculators/formulas";
import { CHART_COLORS } from "@/lib/calculators/constants";
import type { LoanTerm, DonutSegment } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PrincipalCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [rate, setRate] = useState(6.5);
  const [monthsPaid, setMonthsPaid] = useState(12);
  const [term, setTerm] = useState<LoanTerm>(30);

  const result = useMemo(
    () =>
      calculatePrincipalBalance({
        loanAmount,
        annualRate: rate,
        termYears: term,
        monthsPaid,
      }),
    [loanAmount, rate, term, monthsPaid]
  );

  const segments: DonutSegment[] = [
    { name: "Principal Balance", value: result.remainingBalance, color: CHART_COLORS.principalRemaining },
    { name: "Principal Paid", value: result.principalPaid, color: CHART_COLORS.principalPaid },
  ];

  const overviewRows = [
    { label: "Principal Balance", value: fmt(result.remainingBalance) },
    { label: "Principal Paid", value: fmt(result.principalPaid) },
    { label: "Interest Paid", value: fmt(result.interestPaid) },
    { label: "Percent Remaining", value: `${result.percentRemaining.toFixed(2)}%`, isSummary: true },
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
        id="princ-amount"
      />
      <PercentSlider
        label="Interest Rate"
        value={rate}
        onChange={setRate}
        min={1}
        max={12}
        step={0.125}
        id="princ-rate"
      />
      <MonthSlider
        label="Payments Made (Months)"
        value={monthsPaid}
        onChange={setMonthsPaid}
        min={1}
        max={term * 12}
        id="princ-months"
      />
      <LoanTermSelect value={term} onChange={setTerm} id="princ-term" />
    </>
  );

  const graphResults = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-2">Your Results</h3>
      <PaymentDonut
        segments={segments}
        centerLabel="Principal Balance"
        centerValue={fmt(result.remainingBalance)}
        centerSubtext={`${result.percentRemaining.toFixed(2)}%`}
      />
      <div className="mt-4">
        <PaymentBreakdown segments={segments} />
      </div>
    </>
  );

  const overviewResults = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-4">Balance Overview</h3>
      <ResultsTable rows={overviewRows} />
    </>
  );

  return (
    <CalculatorShell
      title="How much will my principal be after x months?"
      description="Check your remaining balance after a number of payments."
      inputs={inputs}
      results={graphResults}
      overviewResults={overviewResults}
      showTabs
      instructions="This calculator figures the principal balance remaining after a certain number of months of payment. This is especially useful in determining your principal balance after the introductory period of your ARM loan."
    />
  );
}
