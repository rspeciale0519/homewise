import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { CalculatorHubCard } from "@/components/calculators/calculator-hub-card";
import { MortgageAdvisor } from "./mortgage-advisor";
import {
  Calculator,
  Home,
  ArrowDownUp,
  DollarSign,
  Building2,
  Receipt,
  Percent,
  CreditCard,
  Scale,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mortgage Calculators — Homewise FL",
  description:
    "Run a quick payment estimate or get three personalized AI mortgage scenarios built around your financial profile.",
};

const CALCULATORS = [
  {
    title: "Mortgage Calculator",
    description: "Estimate your monthly mortgage payment with full breakdown.",
    href: "/mortgage-calculator/mortgage",
    icon: Calculator,
    badge: "Most Popular",
  },
  {
    title: "Refinance Calculator",
    description: "See your new payment after refinancing your existing loan.",
    href: "/mortgage-calculator/refinance",
    icon: ArrowDownUp,
  },
  {
    title: "Extra Payment Calculator",
    description: "See how extra payments shorten your loan and save interest.",
    href: "/mortgage-calculator/extra-payment",
    icon: DollarSign,
  },
  {
    title: "How Much Can I Afford?",
    description: "Find your maximum pre-approval based on income and debt.",
    href: "/mortgage-calculator/affordability",
    icon: Home,
  },
  {
    title: "Principal Calculator",
    description: "Check your remaining balance after a number of payments.",
    href: "/mortgage-calculator/principal",
    icon: Building2,
  },
  {
    title: "Tax Benefits of Buying",
    description: "Estimate tax savings from mortgage interest deductions.",
    href: "/mortgage-calculator/tax-benefits",
    icon: Receipt,
  },
  {
    title: "What's My APR?",
    description: "Calculate your true APR including fees and points.",
    href: "/mortgage-calculator/apr",
    icon: Percent,
  },
  {
    title: "Interest-Only Calculator",
    description: "Calculate your interest-only monthly payment.",
    href: "/mortgage-calculator/interest-only",
    icon: CreditCard,
  },
  {
    title: "Should I Pay Points?",
    description: "Find the breakeven point for paying discount points.",
    href: "/mortgage-calculator/points",
    icon: Scale,
  },
  {
    title: "Income to Qualify",
    description: "Find out how much income you need for a specific home.",
    href: "/mortgage-calculator/income",
    icon: Wallet,
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter your details",
    body: "Income, monthly debt, down payment, and credit score range.",
  },
  {
    step: "02",
    title: "AI analyzes your profile",
    body: "Matches you to loan types and realistic price ranges for your situation.",
  },
  {
    step: "03",
    title: "Get 3 personalized scenarios",
    body: "Conservative, Moderate, and Stretch — each with full payment breakdowns.",
  },
];

export default function MortgageCalculatorsHubPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mortgage-hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mortgage-hero-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container size="xl" className="pt-16 pb-14 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-slate-200 transition-colors">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span aria-current="page" className="text-slate-300">Mortgage Calculators</span>
              </li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 lg:gap-12 items-center">
            <div className="min-h-[320px] flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
                For Buyers
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
                Know Your Numbers Before You Shop
              </h1>
              <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
                Run a quick payment estimate or let our AI build personalized mortgage scenarios around
                your actual financial profile — so you walk into every showing with confidence.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              {HOW_IT_WORKS.map((item, i) => (
                <div
                  key={item.step}
                  className="flex gap-3 items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <span className="font-serif text-2xl font-bold text-crimson-500/60 leading-none shrink-0 w-8 text-center">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>

      {/* Calculator Grid */}
      <section className="section-padding bg-white">
        <Container size="xl">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">
              Financial Tools
            </p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-3">
              Mortgage Calculators
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              Choose a calculator below to estimate payments, affordability, tax benefits, and more.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CALCULATORS.map((calc) => (
              <CalculatorHubCard
                key={calc.href}
                title={calc.title}
                description={calc.description}
                href={calc.href}
                icon={calc.icon}
                badge={"badge" in calc ? calc.badge : undefined}
              />
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              <strong className="text-slate-500">Disclaimer:</strong> Information and interactive
              calculators are made available to you as self-help tools for your independent use and
              are not intended to provide investment advice. We cannot and do not guarantee their
              applicability or accuracy in regards to your individual circumstances. All examples
              are hypothetical and are for illustrative purposes. We encourage you to seek
              personalized advice from qualified professionals regarding all personal finance issues.
            </p>
          </div>
        </Container>
      </section>

      {/* AI Scenario Advisor */}
      <section className="section-padding bg-cream-50">
        <Container size="lg">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">
              AI-Powered
            </p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-3">
              Get Personalized Scenarios
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
              Tell us about your financial situation and our AI will generate three tailored mortgage
              scenarios — Conservative, Moderate, and Stretch — with full breakdowns of loan type,
              payment, and key tradeoffs.
            </p>
          </div>
          <MortgageAdvisor />
        </Container>
      </section>

      {/* CTA Banner */}
      <CtaBanner
        eyebrow="Ready to Take the Next Step?"
        title="Get Pre-Approved Today"
        subtitle="Our mortgage partners can provide a full pre-approval — not just a pre-qualification — so you can make strong offers with confidence."
        primaryCta={{ label: "Get Pre-Approved", href: "/contact" }}
        secondaryCta={{ label: "Find an Agent", href: "/agents" }}
        variant="navy"
      />
    </>
  );
}
