import type { LoanType, LoanTerm, FilingStatus, FederalTaxRate } from "./types";

export const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: "fha", label: "FHA" },
  { value: "conventional", label: "Conventional" },
  { value: "jumbo", label: "Jumbo" },
  { value: "usda", label: "USDA" },
  { value: "va", label: "VA" },
];

export const LOAN_TERMS: { value: LoanTerm; label: string }[] = [
  { value: 5, label: "5 Years" },
  { value: 10, label: "10 Years" },
  { value: 15, label: "15 Years" },
  { value: 20, label: "20 Years" },
  { value: 25, label: "25 Years" },
  { value: 30, label: "30 Years" },
];

export const FILING_STATUSES: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single, Standard Deduction" },
  { value: "married-jointly", label: "Married (Jointly)" },
  { value: "married-separately", label: "Married (Separately)" },
  { value: "head-of-household", label: "Head of Household" },
];

export const TAX_RATES: { value: FederalTaxRate; label: string }[] = [
  { value: 10, label: "10%" },
  { value: 12, label: "12%" },
  { value: 22, label: "22%" },
  { value: 24, label: "24%" },
  { value: 32, label: "32%" },
  { value: 35, label: "35%" },
  { value: 37, label: "37%" },
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 14600,
  "married-jointly": 29200,
  "married-separately": 14600,
  "head-of-household": 21900,
};

export const LOAN_TYPE_CONFIG: Record<LoanType, {
  minDownPercent: number;
  hasMI: boolean;
  miThresholdLTV: number;
  miRateAnnual: number;
  defaultTaxRate: number;
  defaultInsuranceRate: number;
}> = {
  fha: {
    minDownPercent: 3.5,
    hasMI: true,
    miThresholdLTV: 100,
    miRateAnnual: 0.0055,
    defaultTaxRate: 0.012,
    defaultInsuranceRate: 0.005,
  },
  conventional: {
    minDownPercent: 3,
    hasMI: true,
    miThresholdLTV: 80,
    miRateAnnual: 0.005,
    defaultTaxRate: 0.012,
    defaultInsuranceRate: 0.005,
  },
  jumbo: {
    minDownPercent: 10,
    hasMI: false,
    miThresholdLTV: 0,
    miRateAnnual: 0,
    defaultTaxRate: 0.012,
    defaultInsuranceRate: 0.005,
  },
  usda: {
    minDownPercent: 0,
    hasMI: true,
    miThresholdLTV: 100,
    miRateAnnual: 0.0035,
    defaultTaxRate: 0.012,
    defaultInsuranceRate: 0.005,
  },
  va: {
    minDownPercent: 0,
    hasMI: false,
    miThresholdLTV: 0,
    miRateAnnual: 0,
    defaultTaxRate: 0.012,
    defaultInsuranceRate: 0.005,
  },
};

export const DEFAULT_FRONTEND_DTI = 36;
export const DEFAULT_BACKEND_DTI = 50;
export const DEFAULT_SAVINGS_RATE = 5;
export const PREPAID_INTEREST_DAYS = 15;

export const CHART_COLORS = {
  principalAndInterest: "#3a3688",
  taxesAndHOA: "#D4AF6A",
  insurance: "#10b981",
  mortgageInsurance: "#DB2526",
  principalPaid: "#D4AF6A",
  principalRemaining: "#3a3688",
  originalTimeline: "#D4AF6A",
  newTimeline: "#3a3688",
} as const;
