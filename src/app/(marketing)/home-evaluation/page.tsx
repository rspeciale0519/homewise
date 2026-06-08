import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { HomeEvalForm } from "@/components/forms/home-eval-form";
import { createMetadata } from "@/lib/metadata";
import { analyticsBoEnabled } from "@/lib/analytics-flags";

export const metadata: Metadata = createMetadata({
  title: "Free Home Evaluation",
  description: "Get a free Comparative Market Analysis from a Home Wise Realty Group expert. Know what your Central Florida home is worth — no obligation.",
  path: "/home-evaluation",
});

const WHAT_TO_EXPECT = [
  {
    step: "01",
    title: "Tell Us About Your Home",
    body: "Fill out a brief form with your property details — address, bedrooms, bathrooms, and your selling timeline.",
  },
  {
    step: "02",
    title: "We Research Your Market",
    body: "Your assigned agent pulls recent comparable sales, active competition, and current market trends in your neighborhood.",
  },
  {
    step: "03",
    title: "You Receive a Full CMA",
    body: "Within 48 hours, you'll have a professional Comparative Market Analysis with a recommended price range — no strings attached.",
  },
];

const INCLUDES = [
  "Recent comparable sales in your neighborhood (last 90 days)",
  "Active competition analysis — what your home competes against today",
  "Price per square foot trends for your area",
  "Days on market data for similar properties",
  "Recommended list price range with supporting data",
  "Expert recommendations for maximizing your sale price",
];

const GATED_WHAT_TO_EXPECT = [
  {
    step: "01",
    title: "Tell Us About Your Home",
    body: "Fill out a brief form with your property details, address, and selling timeline.",
  },
  {
    step: "02",
    title: "An Agent Reviews Your Request",
    body: "A local Home Wise agent follows up with the next practical steps for your property.",
  },
  {
    step: "03",
    title: "Prepare for a Full CMA",
    body: "Once Back Office analytics are enabled, sold-comp research can support a complete CMA.",
  },
];

const GATED_INCLUDES = [
  "A local Home Wise agent reviews your property request",
  "Private follow-up for pricing questions and selling timeline",
  "Guidance on what information is needed for a full CMA",
  "A clear next step once Back Office sold-data analytics are enabled",
];

export default function HomeEvaluationPage() {
  const boAnalyticsEnabled = analyticsBoEnabled();
  const steps = boAnalyticsEnabled ? WHAT_TO_EXPECT : GATED_WHAT_TO_EXPECT;
  const includes = boAnalyticsEnabled ? INCLUDES : GATED_INCLUDES;

  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
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
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-slate-200 transition-colors">Home</Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-300">Free Home Evaluation</span>
              </li>
            </ol>
          </nav>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">For Sellers</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            What Is Your Home Worth?
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed mb-2">
            {boAnalyticsEnabled
              ? "Get a free, data-driven Comparative Market Analysis from a local expert - with no obligation to list. Know your number before you decide."
              : "Request a local pricing consultation from a Home Wise agent. Automated sold-data analytics are paused until the Back Office MLS feed is enabled."}
          </p>
        </Container>
      </div>

      {/* Process */}
      <section className="section-padding bg-white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-start">
            {/* Left: Form placeholder */}
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Get Started</p>
              <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-6">
                {boAnalyticsEnabled ? "Request Your Free CMA" : "Request a Pricing Consultation"}
              </h2>

              {!boAnalyticsEnabled && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                  Market analytics are unavailable until the Back Office MLS
                  feed is licensed and enabled. An agent can still follow up
                  with next steps and a private market review.
                </div>
              )}

              <HomeEvalForm />
            </div>

            {/* Right: What it includes */}
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-navy-500 mb-3">How It Works</p>
                <div className="space-y-5">
                  {steps.map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="shrink-0 font-serif text-4xl font-bold text-navy-100 leading-none w-12 text-right">
                        {item.step}
                      </div>
                      <div className="pt-1">
                        <h3 className="font-serif text-lg font-semibold text-navy-700 mb-1">{item.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <h3 className="font-serif text-lg font-semibold mb-4">
                  {boAnalyticsEnabled ? "Your CMA Includes" : "Your Request Includes"}
                </h3>
                <ul className="space-y-2.5">
                  {includes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <svg className="h-4 w-4 text-crimson-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <CtaBanner
        eyebrow="Already Listed Elsewhere?"
        title="Get a Second Opinion"
        subtitle="Our evaluation is always free and no-obligation. If you&apos;re not happy with your current representation, we&apos;d be honored to earn your business."
        primaryCta={{ label: "Find an Agent", href: "/agents" }}
        secondaryCta={{ label: "Seller Resources", href: "/sellers" }}
        variant="crimson"
      />
    </>
  );
}
