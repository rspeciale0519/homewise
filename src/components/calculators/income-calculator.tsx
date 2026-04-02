"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { LoanTypeSelect } from "./inputs/loan-type-select";
import { LoanTermSelect } from "./inputs/loan-term-select";
import { ResultHero } from "./results/result-hero";
import { ResultsTable } from "./results/results-table";
import { calculateIncomeToQualify } from "@/lib/calculators/formulas";
import type { LoanType, LoanTerm } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function IncomeCalculator() {
  const [loanType, setLoanType] = useState<LoanType>("conventional");
  const [price, setPrice] = useState(350000);
  const [downPercent, setDownPercent] = useState(3);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState<LoanTerm>(30);

  const result = useMemo(
    () =>
      calculateIncomeToQualify({
        price,
        downPercent,
        annualRate: rate,
        termYears: term,
        loanType,
      }),
    [price, downPercent, rate, term, loanType]
  );

  const rows = [
    { label: "Property Selling Price", value: fmt(result.propertyPrice) },
    { label: "Downpayment", value: fmt(result.downPayment) },
    { label: "Loan Amount", value: fmt(result.loanAmount) },
    { label: "Monthly Principal & Interest", value: fmt(result.monthlyPI) },
    { label: "Monthly Real Estate Taxes", value: fmt(result.monthlyTax) },
    { label: "Monthly Hazard Insurance", value: fmt(result.monthlyInsurance) },
    { label: "Monthly PMI", value: fmt(result.monthlyMI) },
    { label: "Total Mortgage Payment", value: fmt(result.totalPayment) },
    { label: "Income Needed for Payment", value: fmt(result.incomeNeeded), isSummary: true },
    { label: "Allowable Debt Payments", value: fmt(result.allowableDebtPayments), isSummary: true },
  ];

  const inputs = (
    <>
      <LoanTypeSelect value={loanType} onChange={setLoanType} id="income-type" />
      <CurrencySlider
        label="Property Price"
        value={price}
        onChange={setPrice}
        min={50000}
        max={2000000}
        step={5000}
        id="income-price"
      />
      <PercentSlider
        label="Down Payment"
        value={downPercent}
        onChange={setDownPercent}
        min={0}
        max={50}
        step={0.5}
        id="income-down"
        decimals={2}
        secondaryValue={`($${result.downPayment.toLocaleString()})`}
      />
      <PercentSlider
        label="Interest Rate"
        value={rate}
        onChange={setRate}
        min={1}
        max={12}
        step={0.125}
        id="income-rate"
      />
      <LoanTermSelect value={term} onChange={setTerm} id="income-term" />
    </>
  );

  const results = (
    <>
      <ResultHero
        label="Needed Income (Mo)"
        value={fmt(result.incomeNeeded)}
      />
      <ResultsTable rows={rows} />
    </>
  );

  return (
    <CalculatorShell
      title="How much Income do I need to qualify?"
      description="Find out how much income you need for a specific home."
      inputs={inputs}
      results={results}
      instructions="Mortgage lenders use ratios to analyze your mortgage payment and determine how much loan you qualify for. The front ratio used in this calculation is 36%. This ratio compares your total mortgage payment to your monthly income. The back ratio is 50%. This ratio compares your total monthly debt obligations including your total mortgage payment to your monthly income."
    />
  );
}
