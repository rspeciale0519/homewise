"use client";

import { Select } from "@/components/ui/select";
import { LOAN_TERMS } from "@/lib/calculators/constants";
import type { LoanTerm } from "@/lib/calculators/types";

interface LoanTermSelectProps {
  value: LoanTerm;
  onChange: (v: LoanTerm) => void;
  id?: string;
}

export function LoanTermSelect({ value, onChange, id }: LoanTermSelectProps) {
  return (
    <Select
      id={id}
      label="Loan Term"
      value={String(value)}
      onValueChange={(v) => onChange(Number(v) as LoanTerm)}
      options={LOAN_TERMS.map((lt) => ({ value: String(lt.value), label: lt.label }))}
    />
  );
}
