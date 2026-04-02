import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ExtraPaymentCalculator } from "@/components/calculators/extra-payment-calculator";

export const metadata: Metadata = {
  title: "Extra Payment Calculator — Homewise FL",
  description: "See how extra mortgage payments shorten your loan term and save interest over the life of the loan.",
};

export default function ExtraPaymentPage() {
  return (
    <section className="section-padding bg-cream-50">
      <Container size="lg">
        <ExtraPaymentCalculator />
      </Container>
    </section>
  );
}
