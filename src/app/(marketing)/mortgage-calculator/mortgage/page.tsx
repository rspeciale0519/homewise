import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { MortgageCalculatorFull } from "@/components/calculators/mortgage-calculator";

export const metadata: Metadata = {
  title: "Mortgage Calculator — Homewise FL",
  description:
    "Estimate your monthly mortgage payment including principal, interest, taxes, insurance, and mortgage insurance for FHA, Conventional, VA, USDA, and Jumbo loans.",
};

export default function MortgageCalculatorPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <MortgageCalculatorFull />
      </Container>
    </section>
  );
}
