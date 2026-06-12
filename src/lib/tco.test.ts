import { describe, expect, it } from "vitest";
import { calculateTco, monthlyHoa } from "./tco";

describe("monthlyHoa", () => {
  it("normalizes payment frequencies to monthly amounts", () => {
    expect(monthlyHoa(300, "Monthly")).toBe(300);
    expect(monthlyHoa(900, "Quarterly")).toBe(300);
    expect(monthlyHoa(1800, "Semi-Annually")).toBe(300);
    expect(monthlyHoa(3600, "Annually")).toBe(300);
  });

  it("treats unknown frequency as monthly and missing fee as zero", () => {
    expect(monthlyHoa(250, null)).toBe(250);
    expect(monthlyHoa(null, "Monthly")).toBe(0);
    expect(monthlyHoa(0, "Monthly")).toBe(0);
  });
});

describe("calculateTco", () => {
  it("uses real tax data when present", () => {
    const result = calculateTco({ price: 400_000, taxAmount: 4_800, hoaFee: 100, hoaFrequency: "Monthly" });

    expect(result.propertyTax).toBe(400);
    expect(result.taxIsEstimate).toBe(false);
    expect(result.hoa).toBe(100);
    expect(result.downPayment).toBe(80_000);
    expect(result.principalAndInterest).toBeCloseTo(2022.62, 1);
    expect(result.total).toBeCloseTo(
      result.principalAndInterest + result.propertyTax + result.insurance + result.hoa,
      6,
    );
  });

  it("falls back to estimated tax when tax data is missing", () => {
    const result = calculateTco({ price: 300_000 });

    expect(result.taxIsEstimate).toBe(true);
    expect(result.propertyTax).toBe(250);
    expect(result.insurance).toBe(125);
    expect(result.hoa).toBe(0);
  });
});
