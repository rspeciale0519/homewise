import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { RefinanceCalculator } from "@/components/calculators/refinance-calculator";

export const metadata: Metadata = {
  title: "Refinance Calculator — Homewise FL",
  description: "See your new monthly payment after refinancing with full breakdown including taxes, insurance, and MI.",
};

export default function RefinancePage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <RefinanceCalculator />
      </Container>
    </section>
  );
}
