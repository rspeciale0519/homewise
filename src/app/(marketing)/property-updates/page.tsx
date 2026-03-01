import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { PropertyAlertForm } from "@/components/forms/property-alert-form";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Property Updates & Alerts",
  description:
    "Get free email alerts for new listings, price changes, and market activity in your Central Florida target areas. No account required.",
  path: "/property-updates",
});

const ALERT_FEATURES = [
  {
    icon: "🏡",
    title: "New Listings",
    desc: "Be the first to know when a property matching your criteria hits the market.",
  },
  {
    icon: "💰",
    title: "Price Changes",
    desc: "Get notified when sellers reduce their asking price — opportunities move fast.",
  },
  {
    icon: "📊",
    title: "Market Activity",
    desc: "Stay informed about pending sales, sold prices, and neighborhood trends.",
  },
  {
    icon: "⚡",
    title: "Instant Delivery",
    desc: "Alerts are sent the same day a matching property is listed or updated.",
  },
];

export default function PropertyUpdatesPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="alert-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#alert-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-navy-400/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li><Link href="/" className="hover:text-slate-200 transition-colors">Home</Link></li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-slate-300">Property Updates</span>
              </li>
            </ol>
          </nav>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">Stay Informed</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            Never Miss a New Listing
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            Get free email alerts when properties matching your criteria are listed, reduced, or sold in your target Central Florida communities.
          </p>
        </Container>
      </div>

      {/* Form + Features */}
      <section className="section-padding bg-white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Subscribe</p>
              <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-6">Set Up Your Alerts</h2>
              <PropertyAlertForm />
            </div>

            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-navy-500 mb-4">What You&apos;ll Receive</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ALERT_FEATURES.map((f) => (
                    <div key={f.title} className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
                      <div className="text-2xl mb-2">{f.icon}</div>
                      <h3 className="font-serif text-base font-semibold text-navy-700 mb-1">{f.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <h3 className="font-serif text-lg font-semibold mb-3">Why Subscribe?</h3>
                <ul className="space-y-2.5">
                  {[
                    "In Central Florida's competitive market, the best homes sell within days",
                    "Email alerts give you a head start over buyers who only browse online",
                    "Our alerts pull from the full MLS — not just major portal sites",
                    "Completely free, no account required, unsubscribe anytime",
                  ].map((item) => (
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
        eyebrow="Ready to Search Now?"
        title="Browse Available Properties"
        subtitle="Don't want to wait for alerts? Start browsing Central Florida listings right now."
        primaryCta={{ label: "Search Properties", href: "/properties" }}
        secondaryCta={{ label: "Buyer Resources", href: "/buyers" }}
      />
    </>
  );
}
