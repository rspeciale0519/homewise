import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { MortgageCalculator } from "@/components/shared/mortgage-calculator";
import { MortgageAdvisor } from "./mortgage-advisor";

export const metadata: Metadata = {
  title: "Mortgage Calculator — Homewise FL",
  description:
    "Run a quick payment estimate or get three personalized AI mortgage scenarios built around your financial profile.",
};

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

export default function MortgageCalculatorPage() {
  return (
    <>
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Crimson glow orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          {/* Breadcrumb */}
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
                <span className="text-slate-300">Mortgage Calculator</span>
              </li>
            </ol>
          </nav>

          {/* Headline block */}
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            For Buyers
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            Know Your Numbers Before You Shop
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed mb-10">
            Run a quick payment estimate or let our AI build personalized mortgage scenarios around
            your actual financial profile — so you walk into every showing with confidence.
          </p>

          {/* How It Works row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="flex gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4"
              >
                <span className="font-serif text-3xl font-bold text-white/20 leading-none shrink-0 w-10 text-right">
                  {item.step}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── Quick Calculator ── */}
      <section className="section-padding bg-white">
        <Container size="md">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">
              Instant Estimate
            </p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-3">
              Run the Numbers
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              Adjust the sliders to estimate your monthly payment. Includes principal, interest,
              property taxes, and home insurance.
            </p>
          </div>
          <div className="max-w-lg mx-auto">
            <MortgageCalculator />
          </div>
        </Container>
      </section>

      {/* ── AI Scenario Advisor ── */}
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

      {/* ── CTA Banner ── */}
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
