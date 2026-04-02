import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { InterestOnlyCalculator } from "@/components/calculators/interest-only-calculator";

export const metadata: Metadata = {
  title: "Interest-Only Calculator — Homewise FL",
  description: "Calculate your interest-only monthly payment based on loan amount and interest rate.",
};

export default function InterestOnlyPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <InterestOnlyCalculator />
      </Container>
    </section>
  );
}
