"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { LoanTermSelect } from "./inputs/loan-term-select";
import { ResultHero } from "./results/result-hero";
import { ResultsTable } from "./results/results-table";
import { calculateTaxBenefit } from "@/lib/calculators/formulas";
import { InlineInput } from "./inputs/currency-slider";
import { Select } from "@/components/ui/select";
import {
  FILING_STATUSES,
  TAX_RATES,
  MONTHS,
} from "@/lib/calculators/constants";
import type { LoanTerm, FilingStatus, FederalTaxRate } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TaxBenefitsCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState<LoanTerm>(30);
  const [month, setMonth] = useState(1);
  const [filing, setFiling] = useState<FilingStatus>("single");
  const [taxRate, setTaxRate] = useState<FederalTaxRate>(32);
  const [points, setPoints] = useState(2);
  const [stateTax, setStateTax] = useState(5);
  const [realEstateTaxes, setRealEstateTaxes] = useState(1800);
  const [otherDeductions, setOtherDeductions] = useState(1350);

  const result = useMemo(
    () =>
      calculateTaxBenefit({
        loanAmount,
        annualRate: rate,
        termYears: term,
        monthOfPurchase: month,
        filingStatus: filing,
        federalTaxRate: taxRate,
        points,
        stateTaxRate: stateTax,
        realEstateTaxes,
        otherDeductions,
      }),
    [loanAmount, rate, term, month, filing, taxRate, points, stateTax, realEstateTaxes, otherDeductions]
  );

  const rows = [
    { label: "Mortgage Payment", value: fmt(result.monthlyPayment) },
    { label: "Loan Points", value: fmt(result.loanPoints) },
    { label: "Interest Paid", value: fmt(result.interestPaid) },
    { label: "Standard Deduction", value: fmt(result.standardDeduction) },
    { label: "Interest & Points", value: fmt(result.interestAndPoints) },
    { label: "Real Estate Taxes", value: fmt(result.realEstateTaxes) },
    { label: "Other Deductions", value: fmt(result.otherDeductions) },
    { label: "Itemized Deductions", value: fmt(result.itemizedDeductions) },
    { label: "Additional Deductions", value: fmt(result.additionalDeductions) },
    { label: "After Tax Payment", value: fmt(result.afterTaxPayment), isSummary: true },
    { label: "Tax Benefit", value: fmt(result.taxBenefit), isSummary: true },
  ];

  const monthOptions = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
  const filingOptions = FILING_STATUSES.map((f) => ({ value: f.value, label: f.label }));
  const taxRateOptions = TAX_RATES.map((t) => ({ value: String(t.value), label: t.label }));

  const inputs = (
    <>
      <CurrencySlider
        label="Loan Amount"
        value={loanAmount}
        onChange={setLoanAmount}
        min={10000}
        max={2000000}
        step={5000}
        id="tax-amount"
      />
      <PercentSlider
        label="Interest Rate"
        value={rate}
        onChange={setRate}
        min={1}
        max={12}
        step={0.125}
        id="tax-rate"
      />
      <LoanTermSelect value={term} onChange={setTerm} id="tax-term" />
      <Select
        id="tax-month"
        label="Month of Purchase"
        value={String(month)}
        onValueChange={(v) => setMonth(Number(v))}
        options={monthOptions}
      />
      <Select
        id="tax-filing"
        label="Filing Status"
        value={filing}
        onValueChange={(v) => setFiling(v as FilingStatus)}
        options={filingOptions}
      />
      <Select
        id="tax-bracket"
        label="Tax Rate"
        value={String(taxRate)}
        onValueChange={(v) => setTaxRate(Number(v) as FederalTaxRate)}
        options={taxRateOptions}
      />
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="tax-points" className="text-sm font-medium text-navy-700">Points</label>
          <InlineInput
            id="tax-points"
            value={points}
            onChange={setPoints}
            min={0}
            max={10}
            format={(v) => String(v)}
            inputWidth="w-[4rem]"
          />
        </div>
      </div>
      <PercentSlider
        label="State Tax Rate"
        value={stateTax}
        onChange={setStateTax}
        min={0}
        max={15}
        step={0.5}
        id="tax-state"
        decimals={2}
      />
      <CurrencySlider
        label="Real Estate Taxes"
        value={realEstateTaxes}
        onChange={setRealEstateTaxes}
        min={0}
        max={20000}
        step={100}
        id="tax-re"
      />
      <CurrencySlider
        label="Other Deductions"
        value={otherDeductions}
        onChange={setOtherDeductions}
        min={0}
        max={20000}
        step={50}
        id="tax-other"
      />
    </>
  );

  const results = (
    <>
      <ResultHero
        label="Tax Benefit"
        value={fmt(result.taxBenefit)}
        sublabel={result.taxBenefit > 0 ? "annual savings" : "no benefit at these values"}
      />
      <ResultsTable rows={rows} />
    </>
  );

  return (
    <CalculatorShell
      title="Tax Benefits of Buying a Home"
      description="Estimate tax savings from mortgage interest deductions."
      inputs={inputs}
      results={results}
      instructions="This calculator estimates the tax benefit of buying a home. Interest payments and mortgage points are captured in itemized deductions of your tax return. Your itemized deductions (including your mortgage deductions) are compared to your standard deduction to calculate the tax benefit."
    />
  );
}
