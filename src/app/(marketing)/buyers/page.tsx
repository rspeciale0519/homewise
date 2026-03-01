import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { ServiceGrid } from "@/components/content/service-grid";
import { CtaBanner } from "@/components/shared/cta-banner";
import { BUYERS_RESOURCES } from "@/data/content/buyers-resources";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Buyer Resources",
  description: "Everything you need to buy your first — or next — home in Central Florida. Guides, tips, and expert agents ready to help.",
  path: "/buyers",
});

export default function BuyersPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[480px] md:h-[560px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1920&q=80"
          alt="Beautiful home for buyers"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-900/70 to-navy-950/30" />
        <div className="absolute inset-0 flex items-center">
          <Container>
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-2 text-xs text-slate-400">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li className="flex items-center gap-2">
                  <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  <span className="text-slate-300">For Buyers</span>
                </li>
              </ol>
            </nav>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
              For Buyers
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight mb-4 max-w-2xl">
              Find Your Home.<br />
              <span className="italic text-cream-100">Own Your Future.</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-xl leading-relaxed mb-8">
              Our buyer specialists guide you from first search to closing day — with local expertise across every Central Florida community.
            </p>
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors shadow-lg"
            >
              Search Available Homes
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </Container>
        </div>
      </div>

      {/* Buyer resources grid */}
      <section className="section-padding bg-cream-50">
        <Container>
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Buyer Guides</p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-4">
              Your Complete Buying Guide
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              From financing prep to moving day — everything you need to navigate Central Florida&apos;s real estate market with confidence.
            </p>
          </div>
          <ServiceGrid items={BUYERS_RESOURCES} columns={2} />
        </Container>
      </section>

      {/* Why buy with us */}
      <section className="section-padding bg-white">
        <Container size="md">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Why Home Wise</p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-4">Buying Is Better With a Local Expert</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "🗺️", title: "Hyper-Local Knowledge", desc: "Our agents live and work in the communities they serve — they know which streets to love and which to avoid." },
              { icon: "⚡", title: "First to Know", desc: "We give buyer clients early access to off-market listings and alert them the moment a matching property is listed." },
              { icon: "🛡️", title: "Buyer Representation", desc: "As your buyer's agent, we represent your interests exclusively — negotiating the best price and terms on your behalf." },
            ].map((item) => (
              <div key={item.title} className="text-center p-6 rounded-2xl border border-slate-100 shadow-card">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBanner
        eyebrow="Ready to Start?"
        title="Let's Find Your Perfect Home"
        subtitle="Tell us what you're looking for and we'll match you with an agent who specializes in your target area."
        primaryCta={{ label: "Search Properties", href: "/properties" }}
        secondaryCta={{ label: "Find an Agent", href: "/agents" }}
        variant="navy"
      />
    </>
  );
}
