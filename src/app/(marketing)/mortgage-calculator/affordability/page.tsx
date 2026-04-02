import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { AffordabilityCalculator } from "@/components/calculators/affordability-calculator";

export const metadata: Metadata = {
  title: "How Much Home Can I Afford? — Homewise FL",
  description: "Calculate your maximum pre-approval amount based on income, debt, cash position, and DTI ratios.",
};

export default function AffordabilityPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <AffordabilityCalculator />
      </Container>
    </section>
  );
}
