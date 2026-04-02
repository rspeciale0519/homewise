"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { LoanTypeSelect } from "./inputs/loan-type-select";
import { LoanTermSelect } from "./inputs/loan-term-select";
import { PaymentDonut } from "./results/payment-donut";
import { PaymentBreakdown } from "./results/payment-breakdown";
import { ResultsTable } from "./results/results-table";
import { calculateMortgagePayment } from "@/lib/calculators/formulas";
import { CHART_COLORS } from "@/lib/calculators/constants";
import type { LoanType, LoanTerm, DonutSegment } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MortgageCalculatorFull() {
  const [loanType, setLoanType] = useState<LoanType>("conventional");
  const [term, setTerm] = useState<LoanTerm>(30);
  const [price, setPrice] = useState(350000);
  const [downPercent, setDownPercent] = useState(3);
  const [rate, setRate] = useState(6.5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [taxRate, setTaxRate] = useState(1.2);
  const [insRate, setInsRate] = useState(0.5);
  const [hoa, setHoa] = useState(0);

  const result = useMemo(
    () =>
      calculateMortgagePayment({
        price,
        downPercent,
        annualRate: rate,
        termYears: term,
        loanType,
        taxRate: taxRate / 100,
        insuranceRate: insRate / 100,
        monthlyHOA: hoa,
      }),
    [price, downPercent, rate, term, loanType, taxRate, insRate, hoa]
  );

  const segments: DonutSegment[] = [
    { name: "Principal & Interest", value: result.monthlyPI, color: CHART_COLORS.principalAndInterest },
    { name: "Taxes & HOA", value: result.monthlyTax + result.monthlyHOA, color: CHART_COLORS.taxesAndHOA },
    { name: "Hazard Insurance", value: result.monthlyInsurance, color: CHART_COLORS.insurance },
    { name: "Mortgage Insurance", value: result.monthlyMI, color: CHART_COLORS.mortgageInsurance },
  ];

  const overviewRows = [
    { label: "Principal & Interest", value: fmt(result.monthlyPI) },
    { label: "Taxes & HOA", value: fmt(result.monthlyTax + result.monthlyHOA) },
    { label: "Hazard Insurance", value: fmt(result.monthlyInsurance) },
    { label: "Mortgage Insurance", value: fmt(result.monthlyMI) },
    { label: "Total Monthly Payment", value: fmt(result.totalMonthly), isSummary: true },
    { label: "Loan Amount", value: fmt(result.loanAmount), isSummary: true },
  ];

  const inputs = (
    <>
      <div className="grid grid-cols-2 gap-4">
        <LoanTypeSelect value={loanType} onChange={setLoanType} id="mort-loan-type" />
        <LoanTermSelect value={term} onChange={setTerm} id="mort-term" />
      </div>
      <CurrencySlider
        label="Property Price"
        value={price}
        onChange={setPrice}
        min={50000}
        max={2000000}
        step={5000}
        id="mort-price"
      />
      <PercentSlider
        label="Down Payment"
        value={downPercent}
        onChange={setDownPercent}
        min={0}
        max={50}
        step={0.5}
        id="mort-down"
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
        id="mort-rate"
      />
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
            label="Property Tax Rate"
            value={taxRate}
            onChange={setTaxRate}
            min={0}
            max={4}
            step={0.1}
            id="mort-tax"
            decimals={1}
          />
          <PercentSlider
            label="Insurance Rate"
            value={insRate}
            onChange={setInsRate}
            min={0}
            max={2}
            step={0.1}
            id="mort-ins"
            decimals={1}
          />
          <CurrencySlider
            label="Monthly HOA"
            value={hoa}
            onChange={setHoa}
            min={0}
            max={1000}
            step={25}
            id="mort-hoa"
          />
        </div>
      )}
    </>
  );

  const graphResults = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-2">
        Monthly Payments Breakdown
      </h3>
      <PaymentDonut
        segments={segments}
        centerLabel="Your Payment"
        centerValue={fmt(result.totalMonthly)}
      />
      <div className="mt-4">
        <PaymentBreakdown segments={segments} />
      </div>
    </>
  );

  const overviewResults = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-4">
        Payment Overview
      </h3>
      <ResultsTable rows={overviewRows} />
    </>
  );

  return (
    <CalculatorShell
      title="Mortgage Calculator"
      description="Estimate your monthly mortgage payment with taxes, insurance, and MI."
      inputs={inputs}
      results={graphResults}
      overviewResults={overviewResults}
      showTabs
    />
  );
}
