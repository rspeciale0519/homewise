import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PointsCalculator } from "@/components/calculators/points-calculator";

export const metadata: Metadata = {
  title: "Should I Pay Points? — Homewise FL",
  description: "Calculate the breakeven point for paying mortgage discount points and whether it makes financial sense for your situation.",
};

export default function PointsPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <PointsCalculator />
      </Container>
    </section>
  );
}
