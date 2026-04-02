"use client";

import { useState, useMemo } from "react";
import { CalculatorShell } from "./calculator-shell";
import { CurrencySlider } from "./inputs/currency-slider";
import { PercentSlider } from "./inputs/percent-slider";
import { LoanTypeSelect } from "./inputs/loan-type-select";
import { PaymentDonut } from "./results/payment-donut";
import { PaymentBreakdown } from "./results/payment-breakdown";
import { ResultHero } from "./results/result-hero";
import { ResultsTable } from "./results/results-table";
import { calculateAffordability } from "@/lib/calculators/formulas";
import { InlineInput } from "./inputs/currency-slider";
import {
  CHART_COLORS,
  DEFAULT_FRONTEND_DTI,
  DEFAULT_BACKEND_DTI,
} from "@/lib/calculators/constants";
import type { LoanType, DonutSegment } from "@/lib/calculators/types";

const fmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AffordabilityCalculator() {
  const [loanType, setLoanType] = useState<LoanType>("conventional");
  const [income, setIncome] = useState(6000);
  const [debt, setDebt] = useState(0);
  const [cash, setCash] = useState(25000);
  const [rate, setRate] = useState(6.5);
  const [frontDTI, setFrontDTI] = useState(DEFAULT_FRONTEND_DTI);
  const [backDTI, setBackDTI] = useState(DEFAULT_BACKEND_DTI);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = useMemo(
    () =>
      calculateAffordability({
        monthlyIncome: income,
        monthlyDebt: debt,
        cashPosition: cash,
        annualRate: rate,
        termYears: 30,
        loanType,
        frontendDTI: frontDTI,
        backendDTI: backDTI,
      }),
    [income, debt, cash, rate, loanType, frontDTI, backDTI]
  );

  const segments: DonutSegment[] = [
    { name: "Principal & Interest", value: result.monthlyPI, color: CHART_COLORS.principalAndInterest },
    { name: "Taxes & HOA", value: result.monthlyTax, color: CHART_COLORS.taxesAndHOA },
    { name: "Hazard Insurance", value: result.monthlyInsurance, color: CHART_COLORS.insurance },
    { name: "Mortgage Insurance", value: result.monthlyMI, color: CHART_COLORS.mortgageInsurance },
  ];

  const overviewRows = [
    { label: "Max Pre-Approval", value: fmt(result.maxPreApproval) },
    { label: "Max Loan Amount", value: fmt(result.maxLoanAmount) },
    { label: "Monthly Payment", value: fmt(result.monthlyPayment) },
    { label: "Principal & Interest", value: fmt(result.monthlyPI) },
    { label: "Taxes", value: fmt(result.monthlyTax) },
    { label: "Insurance", value: fmt(result.monthlyInsurance) },
    { label: "Mortgage Insurance", value: fmt(result.monthlyMI), isSummary: true },
  ];

  const inputs = (
    <>
      <LoanTypeSelect value={loanType} onChange={setLoanType} id="afford-type" />
      <CurrencySlider
        label="Monthly Income"
        value={income}
        onChange={setIncome}
        min={1000}
        max={50000}
        step={500}
        id="afford-income"
      />
      <CurrencySlider
        label="Monthly Debt"
        value={debt}
        onChange={setDebt}
        min={0}
        max={10000}
        step={100}
        id="afford-debt"
      />
      <CurrencySlider
        label="Cash Position"
        value={cash}
        onChange={setCash}
        min={0}
        max={500000}
        step={1000}
        id="afford-cash"
      />
      <PercentSlider
        label="Interest Rate"
        value={rate}
        onChange={setRate}
        min={1}
        max={12}
        step={0.125}
        id="afford-rate"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="afford-front-dti" className="text-sm font-medium text-navy-700">
                  Frontend DTI
                </label>
              </div>
              <InlineInput
                id="afford-front-dti"
                value={frontDTI}
                onChange={setFrontDTI}
                min={10}
                max={60}
                format={(v) => String(Math.round(v))}
                inputWidth="w-full"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="afford-back-dti" className="text-sm font-medium text-navy-700">
                  Backend DTI
                </label>
              </div>
              <InlineInput
                id="afford-back-dti"
                value={backDTI}
                onChange={setBackDTI}
                min={10}
                max={65}
                format={(v) => String(Math.round(v))}
                inputWidth="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const graphResults = (
    <>
      <ResultHero
        label="Max Pre-Approval"
        value={fmt(result.maxPreApproval)}
      />
      <PaymentDonut
        segments={segments}
        centerLabel="Your Payment"
        centerValue={fmt(result.monthlyPayment)}
      />
      <div className="mt-4">
        <PaymentBreakdown segments={segments} />
      </div>
    </>
  );

  const overviewResultsView = (
    <>
      <h3 className="text-sm font-semibold text-white text-center mb-4">Loan Details</h3>
      <ResultsTable rows={overviewRows} />
    </>
  );

  return (
    <CalculatorShell
      title="How much home can I afford?"
      description="Find your maximum pre-approval based on income, debt, and cash."
      inputs={inputs}
      results={graphResults}
      overviewResults={overviewResultsView}
      showTabs
    />
  );
}
