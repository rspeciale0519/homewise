import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { IncomeCalculator } from "@/components/calculators/income-calculator";

export const metadata: Metadata = {
  title: "Income to Qualify Calculator — Homewise FL",
  description: "Find out how much monthly income you need to qualify for a specific mortgage based on DTI ratios.",
};

export default function IncomePage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <IncomeCalculator />
      </Container>
    </section>
  );
}
