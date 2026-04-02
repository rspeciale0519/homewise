"use client";

import { Select } from "@/components/ui/select";
import { LOAN_TYPES } from "@/lib/calculators/constants";
import type { LoanType } from "@/lib/calculators/types";

interface LoanTypeSelectProps {
  value: LoanType;
  onChange: (v: LoanType) => void;
  id?: string;
}

export function LoanTypeSelect({ value, onChange, id }: LoanTypeSelectProps) {
  return (
    <Select
      id={id}
      label="Loan Type"
      value={value}
      onValueChange={(v) => onChange(v as LoanType)}
      options={LOAN_TYPES.map((lt) => ({ value: lt.value, label: lt.label }))}
    />
  );
}
