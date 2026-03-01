import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { ServiceGrid } from "@/components/content/service-grid";
import { CtaBanner } from "@/components/shared/cta-banner";
import { SELLERS_SERVICES } from "@/data/content/sellers-services";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Seller Resources",
  description:
    "Expert tools and guides to help you sell your Central Florida home faster and for more money. Staging tips, pricing strategy, and more.",
  path: "/sellers",
});

export default function SellersPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[480px] md:h-[560px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80"
          alt="Beautiful home ready to sell"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-900/70 to-navy-950/40" />
        <div className="absolute inset-0 flex items-center">
          <Container>
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-2 text-xs text-slate-400">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li className="flex items-center gap-2">
                  <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  <span className="text-slate-300">For Sellers</span>
                </li>
              </ol>
            </nav>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
              For Sellers
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight mb-4 max-w-2xl">
              Sell Smarter.<br />
              <span className="italic text-cream-100">Sell for More.</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-xl leading-relaxed mb-8">
              Our experienced seller agents and comprehensive resources help you maximize your home&apos;s value and close with confidence.
            </p>
            <Link
              href="/home-evaluation"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors shadow-lg"
            >
              Get Your Free Home Evaluation
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </Container>
        </div>
      </div>

      {/* Service Grid */}
      <section className="section-padding bg-cream-50">
        <Container>
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Resources</p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-4">
              Everything You Need to Sell
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              From first listing to closing day — guides, tips, and expert advice from Central Florida&apos;s most trusted agents.
            </p>
          </div>
          <ServiceGrid items={SELLERS_SERVICES} columns={3} />
        </Container>
      </section>

      <CtaBanner
        eyebrow="Take the First Step"
        title="What Is Your Home Worth Today?"
        subtitle="Get a free, no-obligation home evaluation from a local expert who knows your neighborhood."
        primaryCta={{ label: "Request Free Evaluation", href: "/home-evaluation" }}
        secondaryCta={{ label: "Find an Agent", href: "/agents" }}
        variant="navy"
      />
    </>
  );
}
