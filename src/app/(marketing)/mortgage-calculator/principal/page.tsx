import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PrincipalCalculator } from "@/components/calculators/principal-calculator";

export const metadata: Metadata = {
  title: "Principal Balance Calculator — Homewise FL",
  description: "Check your remaining mortgage balance after a number of monthly payments.",
};

export default function PrincipalPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <PrincipalCalculator />
      </Container>
    </section>
  );
}
