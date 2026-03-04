import type { Metadata } from "next";
import { MortgageAdvisor } from "./mortgage-advisor";

export const metadata: Metadata = {
  title: "AI Mortgage Scenario Advisor — Homewise FL",
  description: "Get personalized mortgage scenarios based on your financial situation",
};

export default function MortgageCalculatorPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mb-3">
          AI Mortgage Scenario Advisor
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Enter your financial details and our AI will generate three personalized mortgage
          scenarios to help you understand your buying power.
        </p>
      </div>
      <MortgageAdvisor />
    </div>
  );
}
