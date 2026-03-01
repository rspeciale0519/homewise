import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { BuyerRequestForm } from "@/components/forms/buyer-request-form";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Property Request",
  description:
    "Tell us what you're looking for and a Home Wise buyer specialist will start searching for your perfect Central Florida home — no obligation.",
  path: "/buyers/request",
});

const BENEFITS = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Personalized Search",
    desc: "We search the full MLS — including off-market and coming-soon listings — based on your exact criteria.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Quick Response",
    desc: "A buyer specialist reviews your request within one business day and reaches out with curated matches.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Zero Obligation",
    desc: "No commitment, no pressure. Our service is completely free for buyers — the seller pays our commission.",
  },
];

export default function BuyerRequestPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="req-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#req-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li><Link href="/" className="hover:text-slate-200 transition-colors">Home</Link></li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <Link href="/buyers" className="hover:text-slate-200 transition-colors">For Buyers</Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-slate-300">Property Request</span>
              </li>
            </ol>
          </nav>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">For Buyers</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            Tell Us What You Want
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            Describe your dream home and let our buyer specialists do the searching. We&apos;ll match you with properties that fit — including listings you won&apos;t find on your own.
          </p>
        </Container>
      </div>

      {/* Form + Sidebar */}
      <section className="section-padding bg-white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Get Started</p>
              <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-6">Describe Your Ideal Home</h2>
              <BuyerRequestForm />
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-navy-500 mb-4">Why Use This Service?</p>
                <div className="space-y-4">
                  {BENEFITS.map((b) => (
                    <div key={b.title} className="flex gap-4">
                      <div className="shrink-0 h-10 w-10 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
                        {b.icon}
                      </div>
                      <div>
                        <h3 className="font-serif text-base font-semibold text-navy-700 mb-1">{b.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <h3 className="font-serif text-lg font-semibold mb-3">How It Works</h3>
                <ol className="space-y-3">
                  {[
                    "Submit your preferences using this form",
                    "A buyer specialist reviews your criteria within 24 hours",
                    "You receive curated property matches via email",
                    "Schedule viewings with your dedicated agent",
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="shrink-0 h-6 w-6 rounded-full bg-crimson-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <CtaBanner
        eyebrow="Prefer to Browse?"
        title="Search Properties Yourself"
        subtitle="Explore our listings with powerful filters — or let us do the work for you."
        primaryCta={{ label: "Search Properties", href: "/properties" }}
        secondaryCta={{ label: "Find an Agent", href: "/agents" }}
        variant="crimson"
      />
    </>
  );
}
