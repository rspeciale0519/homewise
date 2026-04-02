"use client";

import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

const LOAN_TERMS = [
  { value: 30, label: "30 yr" },
  { value: 15, label: "15 yr" },
] as const;

const DEFAULT_TAX_RATE = 0.0115;
const DEFAULT_INSURANCE_RATE = 0.0035;

export function MortgageCalculator() {
  const [price, setPrice] = useState(350000);
  const [downPercent, setDownPercent] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState<30 | 15>(30);

  const result = useMemo(() => {
    const downPayment = price * (downPercent / 100);
    const loanAmount = price - downPayment;
    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;

    let monthlyPI: number;
    if (monthlyRate === 0) {
      monthlyPI = loanAmount / numPayments;
    } else {
      monthlyPI =
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    const monthlyTax = (price * DEFAULT_TAX_RATE) / 12;
    const monthlyInsurance = (price * DEFAULT_INSURANCE_RATE) / 12;
    const total = monthlyPI + monthlyTax + monthlyInsurance;

    return {
      principal: Math.round(monthlyPI),
      taxes: Math.round(monthlyTax),
      insurance: Math.round(monthlyInsurance),
      total: Math.round(total),
      downPayment: Math.round(downPayment),
      loanAmount: Math.round(loanAmount),
    };
  }, [price, downPercent, rate, term]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8">
        <h3 className="font-serif text-lg font-semibold text-navy-700 mb-1">Mortgage Calculator</h3>
        <p className="text-xs text-slate-400 mb-6">Estimate your monthly payment</p>

        <div className="space-y-5">
          {/* Home price */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="calc-price" className="text-sm font-medium text-navy-700">Home Price</label>
              <InlineNumberInput
                id="calc-price"
                value={price}
                onChange={setPrice}
                min={100000}
                max={2000000}
                step={5000}
                format={(v) => `$${v.toLocaleString()}`}
                ariaLabel="Home price in dollars"
                inputWidth="w-[7.5rem]"
              />
            </div>
            <input
              type="range"
              id="calc-price-range"
              name="calc-price-range"
              aria-label="Home price slider"
              min={100000}
              max={2000000}
              step={5000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-crimson-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>$100k</span>
              <span>$2M</span>
            </div>
          </div>

          {/* Down payment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="calc-down" className="text-sm font-medium text-navy-700">Down Payment</label>
              <span className="flex items-center gap-1.5">
                <InlineNumberInput
                  id="calc-down"
                  value={downPercent}
                  onChange={setDownPercent}
                  min={0}
                  max={50}
                  step={1}
                  format={(v) => `${v}%`}
                  ariaLabel="Down payment percentage"
                  inputWidth="w-14"
                />
                <span className="text-xs text-slate-400 font-normal">
                  (${result.downPayment.toLocaleString()})
                </span>
              </span>
            </div>
            <input
              type="range"
              id="calc-down-range"
              name="calc-down-range"
              aria-label="Down payment slider"
              min={0}
              max={50}
              step={1}
              value={downPercent}
              onChange={(e) => setDownPercent(Number(e.target.value))}
              className="w-full accent-crimson-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>

          {/* Interest rate */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="calc-rate" className="text-sm font-medium text-navy-700">Interest Rate</label>
              <InlineNumberInput
                id="calc-rate"
                value={rate}
                onChange={setRate}
                min={2}
                max={12}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                ariaLabel="Annual interest rate"
                inputWidth="w-[4.5rem]"
              />
            </div>
            <input
              type="range"
              id="calc-rate-range"
              name="calc-rate-range"
              aria-label="Interest rate slider"
              min={2}
              max={12}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-crimson-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>2%</span>
              <span>12%</span>
            </div>
          </div>

          {/* Loan term */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Loan Term</label>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {LOAN_TERMS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTerm(t.value)}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200",
                    term === t.value
                      ? "bg-white text-navy-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-navy-600 px-6 sm:px-8 py-6 text-white">
        <div className="text-center mb-4">
          <p className="text-xs text-navy-200 uppercase tracking-wider mb-1">Estimated Monthly Payment</p>
          <p className="font-serif text-display-sm font-bold">${result.total.toLocaleString()}</p>
        </div>

        <div className="space-y-2">
          <BreakdownRow label="Principal & Interest" amount={result.principal} />
          <BreakdownRow label="Property Taxes" amount={result.taxes} />
          <BreakdownRow label="Home Insurance" amount={result.insurance} />
          <div className="pt-2 border-t border-navy-500 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-navy-200">Loan Amount</span>
              <span className="font-medium">${result.loanAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineNumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step,
  format,
  ariaLabel,
  inputWidth,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  ariaLabel: string;
  inputWidth: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={ref}
      id={id}
      name={id}
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={isFocused ? draft : format(value)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        setIsFocused(true);
        setDraft(String(value));
        requestAnimationFrame(() => ref.current?.select());
      }}
      onBlur={() => {
        setIsFocused(false);
        const parsed = parseFloat(draft.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed)) {
          onChange(Math.min(max, Math.max(min, parsed)));
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") ref.current?.blur();
        if (e.key === "Escape") {
          setDraft(String(value));
          ref.current?.blur();
        }
      }}
      className={cn(
        "text-sm font-semibold text-navy-700 text-right bg-transparent",
        "rounded-md px-2 py-0.5 -my-0.5",
        "border border-dashed border-slate-200",
        "hover:border-solid hover:border-slate-300 hover:bg-slate-50/80",
        "focus:border-solid focus:border-crimson-500 focus:bg-white focus:outline-none",
        "focus:shadow-[0_0_0_2px_rgba(192,38,55,0.1)]",
        "transition-all duration-150 cursor-text",
        inputWidth
      )}
    />
  );
}

function BreakdownRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-navy-200">{label}</span>
      <span className="font-medium text-white">${amount.toLocaleString()}/mo</span>
    </div>
  );
}
