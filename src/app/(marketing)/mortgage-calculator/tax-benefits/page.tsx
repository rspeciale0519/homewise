import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { TaxBenefitsCalculator } from "@/components/calculators/tax-benefits-calculator";

export const metadata: Metadata = {
  title: "Tax Benefits of Buying — Homewise FL",
  description: "Estimate the tax benefits of buying a home, comparing itemized deductions with mortgage interest to the standard deduction.",
};

export default function TaxBenefitsPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <TaxBenefitsCalculator />
      </Container>
    </section>
  );
}
