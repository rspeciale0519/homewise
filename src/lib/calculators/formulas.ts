import type {
  LoanType,
  MortgagePaymentResult,
  AmortizationEntry,
  PayoffComparisonResult,
  AffordabilityResult,
  PrincipalBalanceResult,
  TaxBenefitResult,
  APRResult,
  PointsBreakevenResult,
  IncomeToQualifyResult,
  FilingStatus,
} from "./types";
import {
  LOAN_TYPE_CONFIG,
  STANDARD_DEDUCTIONS,
  PREPAID_INTEREST_DAYS,
} from "./constants";

/** Monthly principal & interest payment using standard amortization formula. */
export function calculateMonthlyPI(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;

  if (monthlyRate === 0) return principal / numPayments;

  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/** Full mortgage payment breakdown including taxes, insurance, MI. */
export function calculateMortgagePayment(params: {
  price: number;
  downPercent: number;
  annualRate: number;
  termYears: number;
  loanType: LoanType;
  taxRate?: number;
  insuranceRate?: number;
  monthlyHOA?: number;
}): MortgagePaymentResult {
  const config = LOAN_TYPE_CONFIG[params.loanType];
  const downPayment = params.price * (params.downPercent / 100);
  const loanAmount = params.price - downPayment;
  const ltv = (loanAmount / params.price) * 100;

  const monthlyPI = calculateMonthlyPI(loanAmount, params.annualRate, params.termYears);
  const taxRate = params.taxRate ?? config.defaultTaxRate;
  const insuranceRate = params.insuranceRate ?? config.defaultInsuranceRate;
  const monthlyTax = (params.price * taxRate) / 12;
  const monthlyInsurance = (params.price * insuranceRate) / 12;
  const monthlyHOA = params.monthlyHOA ?? 0;

  let monthlyMI = 0;
  if (config.hasMI && ltv > config.miThresholdLTV) {
    monthlyMI = (loanAmount * config.miRateAnnual) / 12;
  } else if (config.hasMI && params.loanType === "conventional" && ltv > 80) {
    monthlyMI = (loanAmount * config.miRateAnnual) / 12;
  }

  return {
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyMI,
    monthlyHOA,
    totalMonthly: monthlyPI + monthlyTax + monthlyInsurance + monthlyMI + monthlyHOA,
    loanAmount,
    downPayment,
  };
}

/** Refinance payment — no down payment, no MI (assumes adequate equity). */
export function calculateRefinancePayment(params: {
  loanAmount: number;
  annualRate: number;
  termYears: number;
  loanType: LoanType;
  taxRate?: number;
  insuranceRate?: number;
  monthlyHOA?: number;
  estimatedPropertyValue?: number;
}): MortgagePaymentResult {
  const config = LOAN_TYPE_CONFIG[params.loanType];
  const propertyValue = params.estimatedPropertyValue ?? params.loanAmount / 0.8;
  const taxRate = params.taxRate ?? config.defaultTaxRate;
  const insuranceRate = params.insuranceRate ?? config.defaultInsuranceRate;

  const monthlyPI = calculateMonthlyPI(params.loanAmount, params.annualRate, params.termYears);
  const monthlyTax = (propertyValue * taxRate) / 12;
  const monthlyInsurance = (propertyValue * insuranceRate) / 12;
  const monthlyHOA = params.monthlyHOA ?? 0;

  return {
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyMI: 0,
    monthlyHOA,
    totalMonthly: monthlyPI + monthlyTax + monthlyInsurance + monthlyHOA,
    loanAmount: params.loanAmount,
    downPayment: 0,
  };
}

/** Generate full amortization schedule. */
export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number
): AmortizationEntry[] {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  const monthlyPayment = calculateMonthlyPI(principal, annualRate, termYears);

  const schedule: AmortizationEntry[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let month = 1; month <= numPayments; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    totalInterest += interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance,
      totalInterest,
    });

    if (balance <= 0) break;
  }

  return schedule;
}

/** Compare original payoff vs accelerated payoff with extra payments. */
export function calculatePayoffWithExtraPayment(params: {
  loanAmount: number;
  annualRate: number;
  termYears: number;
  newMonthlyPayment: number;
}): PayoffComparisonResult {
  const monthlyRate = params.annualRate / 100 / 12;
  const originalMonths = params.termYears * 12;

  const originalSchedule = calculateAmortizationSchedule(
    params.loanAmount,
    params.annualRate,
    params.termYears
  );
  const originalTotalInterest =
    originalSchedule[originalSchedule.length - 1]?.totalInterest ?? 0;
  const originalTotalCost = params.loanAmount + originalTotalInterest;

  let balance = params.loanAmount;
  let newMonths = 0;
  let newTotalInterest = 0;

  while (balance > 0 && newMonths < originalMonths * 2) {
    const interestPayment = balance * monthlyRate;
    const payment = Math.min(params.newMonthlyPayment, balance + interestPayment);
    const principalPayment = payment - interestPayment;
    newTotalInterest += interestPayment;
    balance = Math.max(0, balance - principalPayment);
    newMonths++;
  }

  const newTotalCost = params.loanAmount + newTotalInterest;

  return {
    originalMonths,
    originalTotalInterest,
    originalTotalCost,
    newMonths,
    newTotalInterest,
    newTotalCost,
    monthsSaved: originalMonths - newMonths,
    interestSaved: originalTotalInterest - newTotalInterest,
  };
}

/** Calculate maximum home affordability based on income and DTI ratios. */
export function calculateAffordability(params: {
  monthlyIncome: number;
  monthlyDebt: number;
  cashPosition: number;
  annualRate: number;
  termYears: number;
  loanType: LoanType;
  frontendDTI: number;
  backendDTI: number;
  downPaymentPercent?: number;
}): AffordabilityResult {
  const config = LOAN_TYPE_CONFIG[params.loanType];
  const monthlyRate = params.annualRate / 100 / 12;
  const numPayments = params.termYears * 12;

  const backendMaxPayment = params.monthlyIncome * (params.backendDTI / 100) - params.monthlyDebt;
  const frontendMaxPayment = params.monthlyIncome * (params.frontendDTI / 100);
  const maxTotalPayment = Math.min(backendMaxPayment, frontendMaxPayment);

  const taxInsRatio = config.defaultTaxRate / 12 + config.defaultInsuranceRate / 12;
  const miRatio = config.hasMI ? config.miRateAnnual / 12 : 0;

  let maxLoanAmount: number;
  if (monthlyRate === 0) {
    maxLoanAmount = maxTotalPayment * numPayments;
  } else {
    const factor =
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    const piPerDollar = factor;
    const totalPerDollar = piPerDollar + taxInsRatio + miRatio;
    maxLoanAmount = maxTotalPayment / totalPerDollar;
  }

  const downPayment = Math.min(params.cashPosition, params.cashPosition);
  const maxPropertyPrice = maxLoanAmount + downPayment;
  const actualLoan = maxPropertyPrice - downPayment;

  const monthlyPI = calculateMonthlyPI(actualLoan, params.annualRate, params.termYears);
  const monthlyTax = (maxPropertyPrice * config.defaultTaxRate) / 12;
  const monthlyInsurance = (maxPropertyPrice * config.defaultInsuranceRate) / 12;
  const ltv = (actualLoan / maxPropertyPrice) * 100;
  const monthlyMI =
    config.hasMI && ltv > (params.loanType === "conventional" ? 80 : config.miThresholdLTV)
      ? (actualLoan * config.miRateAnnual) / 12
      : 0;

  return {
    maxPreApproval: maxPropertyPrice,
    maxLoanAmount: actualLoan,
    maxPropertyPrice,
    monthlyPayment: monthlyPI + monthlyTax + monthlyInsurance + monthlyMI,
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyMI,
  };
}

/** Calculate principal balance remaining after N months of payments. */
export function calculatePrincipalBalance(params: {
  loanAmount: number;
  annualRate: number;
  termYears: number;
  monthsPaid: number;
}): PrincipalBalanceResult {
  const schedule = calculateAmortizationSchedule(
    params.loanAmount,
    params.annualRate,
    params.termYears
  );

  const clampedMonth = Math.min(params.monthsPaid, schedule.length);
  const entry = schedule[clampedMonth - 1];

  if (!entry) {
    return {
      remainingBalance: params.loanAmount,
      principalPaid: 0,
      interestPaid: 0,
      percentPaid: 0,
      percentRemaining: 100,
    };
  }

  const principalPaid = params.loanAmount - entry.balance;

  return {
    remainingBalance: entry.balance,
    principalPaid,
    interestPaid: entry.totalInterest,
    percentPaid: (principalPaid / params.loanAmount) * 100,
    percentRemaining: (entry.balance / params.loanAmount) * 100,
  };
}

/** Estimate tax benefit of buying a home. */
export function calculateTaxBenefit(params: {
  loanAmount: number;
  annualRate: number;
  termYears: number;
  monthOfPurchase: number;
  filingStatus: FilingStatus;
  federalTaxRate: number;
  points: number;
  stateTaxRate: number;
  realEstateTaxes: number;
  otherDeductions: number;
}): TaxBenefitResult {
  const monthlyPayment = calculateMonthlyPI(
    params.loanAmount,
    params.annualRate,
    params.termYears
  );
  const monthlyRate = params.annualRate / 100 / 12;

  const monthsInFirstYear = 13 - params.monthOfPurchase;
  let interestPaid = 0;
  let balance = params.loanAmount;
  for (let i = 0; i < monthsInFirstYear; i++) {
    const interestPayment = balance * monthlyRate;
    interestPaid += interestPayment;
    balance -= monthlyPayment - interestPayment;
  }

  const loanPoints = params.loanAmount * (params.points / 100);
  const interestAndPoints = interestPaid + loanPoints;
  const standardDeduction = STANDARD_DEDUCTIONS[params.filingStatus];
  const itemizedDeductions =
    interestAndPoints + params.realEstateTaxes + params.otherDeductions;
  const additionalDeductions = itemizedDeductions - standardDeduction;

  const combinedRate = (params.federalTaxRate + params.stateTaxRate) / 100;
  const taxBenefit = additionalDeductions * combinedRate;
  const afterTaxPayment = monthlyPayment - taxBenefit / 12;

  return {
    monthlyPayment,
    loanPoints,
    interestPaid,
    standardDeduction,
    interestAndPoints,
    realEstateTaxes: params.realEstateTaxes,
    otherDeductions: params.otherDeductions,
    itemizedDeductions,
    additionalDeductions,
    afterTaxPayment,
    taxBenefit,
  };
}

/** Calculate APR including all fees using Newton's method approximation. */
export function calculateAPR(params: {
  loanAmount: number;
  annualRate: number;
  termYears: number;
  originationFeePercent: number;
  points: number;
  otherFees: number;
}): APRResult {
  const monthlyPayment = calculateMonthlyPI(
    params.loanAmount,
    params.annualRate,
    params.termYears
  );
  const numPayments = params.termYears * 12;

  const originationFeeAmount = params.loanAmount * (params.originationFeePercent / 100);
  const discountPointsAmount = params.loanAmount * (params.points / 100);
  const dailyRate = params.annualRate / 100 / 365;
  const prepaidInterest = params.loanAmount * dailyRate * PREPAID_INTEREST_DAYS;
  const totalFees = originationFeeAmount + discountPointsAmount + prepaidInterest + params.otherFees;

  const netLoan = params.loanAmount - totalFees;

  let aprGuess = params.annualRate / 100;
  for (let iter = 0; iter < 100; iter++) {
    const monthlyGuess = aprGuess / 12;
    const pvFactor =
      (1 - Math.pow(1 + monthlyGuess, -numPayments)) / monthlyGuess;
    const pv = monthlyPayment * pvFactor;
    const diff = pv - netLoan;

    const pvDerivative =
      monthlyPayment *
      ((numPayments * Math.pow(1 + monthlyGuess, -(numPayments + 1))) / monthlyGuess -
        (1 - Math.pow(1 + monthlyGuess, -numPayments)) / (monthlyGuess * monthlyGuess));
    const dPvdAPR = pvDerivative / 12;

    const adjustment = diff / dPvdAPR;
    aprGuess -= adjustment;

    if (Math.abs(adjustment) < 1e-10) break;
  }

  return {
    apr: aprGuess * 100,
    originationFeeAmount,
    discountPointsAmount,
    prepaidInterest,
    totalFees,
    monthlyPayment,
  };
}

/** Calculate interest-only payment. */
export function calculateInterestOnly(
  principal: number,
  annualRate: number
): number {
  return (principal * (annualRate / 100)) / 12;
}

/** Calculate points breakeven analysis. */
export function calculatePointsBreakeven(params: {
  loanAmount: number;
  rateWithoutPoints: number;
  rateWithPoints: number;
  pointsPercent: number;
  termYears: number;
  savingsRate: number;
}): PointsBreakevenResult {
  const paymentWithoutPoints = calculateMonthlyPI(
    params.loanAmount,
    params.rateWithoutPoints,
    params.termYears
  );
  const paymentWithPoints = calculateMonthlyPI(
    params.loanAmount,
    params.rateWithPoints,
    params.termYears
  );
  const monthlySavings = paymentWithoutPoints - paymentWithPoints;
  const costOfPoints = params.loanAmount * (params.pointsPercent / 100);
  const monthlyInvestmentIncome = (costOfPoints * (params.savingsRate / 100)) / 12;
  const trueMonthlySavings = monthlySavings - monthlyInvestmentIncome;

  let breakevenMonths = 0;
  if (trueMonthlySavings > 0) {
    breakevenMonths = Math.ceil(costOfPoints / trueMonthlySavings);
  } else if (trueMonthlySavings <= 0) {
    breakevenMonths = -1;
  }

  const breakevenYears = breakevenMonths > 0 ? Math.floor(breakevenMonths / 12) : 0;
  const breakevenRemainingMonths = breakevenMonths > 0 ? breakevenMonths % 12 : 0;

  return {
    paymentWithoutPoints,
    paymentWithPoints,
    monthlySavings,
    costOfPoints,
    savingsRateOfReturn: params.savingsRate,
    monthlyInvestmentIncome,
    trueMonthlySavings,
    breakevenMonths,
    breakevenYears,
    breakevenRemainingMonths,
  };
}

/** Calculate income needed to qualify for a mortgage. */
export function calculateIncomeToQualify(params: {
  price: number;
  downPercent: number;
  annualRate: number;
  termYears: number;
  loanType: LoanType;
  frontendDTI?: number;
  backendDTI?: number;
}): IncomeToQualifyResult {
  const payment = calculateMortgagePayment({
    price: params.price,
    downPercent: params.downPercent,
    annualRate: params.annualRate,
    termYears: params.termYears,
    loanType: params.loanType,
  });

  const dti = (params.frontendDTI ?? 36) / 100;
  const backendDti = (params.backendDTI ?? 50) / 100;
  const incomeNeeded = payment.totalMonthly / dti;
  const allowableDebtPayments = incomeNeeded * backendDti - payment.totalMonthly;

  return {
    propertyPrice: params.price,
    downPayment: payment.downPayment,
    loanAmount: payment.loanAmount,
    monthlyPI: payment.monthlyPI,
    monthlyTax: payment.monthlyTax,
    monthlyInsurance: payment.monthlyInsurance,
    monthlyMI: payment.monthlyMI,
    totalPayment: payment.totalMonthly,
    incomeNeeded,
    allowableDebtPayments: Math.max(0, allowableDebtPayments),
  };
}
