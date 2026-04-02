import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { APRCalculator } from "@/components/calculators/apr-calculator";

export const metadata: Metadata = {
  title: "APR Calculator — Homewise FL",
  description: "Calculate the true Annual Percentage Rate of your mortgage including origination fees, discount points, and other loan costs.",
};

export default function APRPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <APRCalculator />
      </Container>
    </section>
  );
}
