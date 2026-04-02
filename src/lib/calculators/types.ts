export type LoanType = "fha" | "conventional" | "jumbo" | "usda" | "va";

export type LoanTerm = 5 | 10 | 15 | 20 | 25 | 30;

export type FilingStatus =
  | "single"
  | "married-jointly"
  | "married-separately"
  | "head-of-household";

export type FederalTaxRate = 10 | 12 | 22 | 24 | 32 | 35 | 37;

export interface MortgagePaymentResult {
  monthlyPI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyMI: number;
  monthlyHOA: number;
  totalMonthly: number;
  loanAmount: number;
  downPayment: number;
}

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  totalInterest: number;
}

export interface PayoffComparisonResult {
  originalMonths: number;
  originalTotalInterest: number;
  originalTotalCost: number;
  newMonths: number;
  newTotalInterest: number;
  newTotalCost: number;
  monthsSaved: number;
  interestSaved: number;
}

export interface AffordabilityResult {
  maxPreApproval: number;
  maxLoanAmount: number;
  maxPropertyPrice: number;
  monthlyPayment: number;
  monthlyPI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyMI: number;
}

export interface PrincipalBalanceResult {
  remainingBalance: number;
  principalPaid: number;
  interestPaid: number;
  percentPaid: number;
  percentRemaining: number;
}

export interface TaxBenefitResult {
  monthlyPayment: number;
  loanPoints: number;
  interestPaid: number;
  standardDeduction: number;
  interestAndPoints: number;
  realEstateTaxes: number;
  otherDeductions: number;
  itemizedDeductions: number;
  additionalDeductions: number;
  afterTaxPayment: number;
  taxBenefit: number;
}

export interface APRResult {
  apr: number;
  originationFeeAmount: number;
  discountPointsAmount: number;
  prepaidInterest: number;
  totalFees: number;
  monthlyPayment: number;
}

export interface PointsBreakevenResult {
  paymentWithoutPoints: number;
  paymentWithPoints: number;
  monthlySavings: number;
  costOfPoints: number;
  savingsRateOfReturn: number;
  monthlyInvestmentIncome: number;
  trueMonthlySavings: number;
  breakevenMonths: number;
  breakevenYears: number;
  breakevenRemainingMonths: number;
}

export interface IncomeToQualifyResult {
  propertyPrice: number;
  downPayment: number;
  loanAmount: number;
  monthlyPI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyMI: number;
  totalPayment: number;
  incomeNeeded: number;
  allowableDebtPayments: number;
}

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}
