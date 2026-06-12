export const TCO_DEFAULTS = {
  downPaymentRate: 0.2,
  annualInterestRate: 0.065,
  termYears: 30,
  fallbackAnnualTaxRate: 0.01,
  annualInsuranceRate: 0.005,
} as const;

export type TcoInput = {
  price: number;
  taxAmount?: number | null;
  hoaFee?: number | null;
  hoaFrequency?: string | null;
};

export type TcoBreakdown = {
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  hoa: number;
  total: number;
  downPayment: number;
  taxIsEstimate: boolean;
};

export function monthlyHoa(fee: number | null | undefined, frequency: string | null | undefined): number {
  if (fee == null || fee <= 0) return 0;
  switch (frequency?.trim().toLowerCase()) {
    case "monthly":
      return fee;
    case "quarterly":
      return fee / 3;
    case "semi-annually":
    case "semi-annual":
    case "semiannually":
      return fee / 6;
    case "annually":
    case "annual":
    case "yearly":
      return fee / 12;
    default:
      return fee;
  }
}

export function calculateTco(input: TcoInput): TcoBreakdown {
  const { price } = input;
  const downPayment = price * TCO_DEFAULTS.downPaymentRate;
  const loanAmount = price - downPayment;
  const monthlyRate = TCO_DEFAULTS.annualInterestRate / 12;
  const numPayments = TCO_DEFAULTS.termYears * 12;
  const growth = Math.pow(1 + monthlyRate, numPayments);
  const principalAndInterest = (loanAmount * monthlyRate * growth) / (growth - 1);

  const hasRealTax = input.taxAmount != null && input.taxAmount > 0;
  const taxIsEstimate = !hasRealTax;
  const propertyTax =
    input.taxAmount != null && input.taxAmount > 0
      ? input.taxAmount / 12
      : (price * TCO_DEFAULTS.fallbackAnnualTaxRate) / 12;

  const insurance = (price * TCO_DEFAULTS.annualInsuranceRate) / 12;
  const hoa = monthlyHoa(input.hoaFee, input.hoaFrequency);

  return {
    principalAndInterest,
    propertyTax,
    insurance,
    hoa,
    total: principalAndInterest + propertyTax + insurance + hoa,
    downPayment,
    taxIsEstimate,
  };
}
