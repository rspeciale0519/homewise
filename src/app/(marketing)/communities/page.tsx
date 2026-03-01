import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { COMMUNITIES } from "@/data/content/communities";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Central Florida Communities",
  description:
    "Explore Central Florida's most desirable communities. Local market stats, neighborhood highlights, and homes for sale in Seminole, Orange, Osceola, Volusia, and Lake counties.",
  path: "/communities",
});

export default function CommunitiesPage() {
  const counties = [...new Set(COMMUNITIES.map((c) => c.county))];

  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="comm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#comm-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li><Link href="/" className="hover:text-slate-200 transition-colors">Home</Link></li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-slate-300">Communities</span>
              </li>
            </ol>
          </nav>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">Local Expertise</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            Central Florida Communities
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            Discover what makes each neighborhood unique — from market statistics and school ratings to lifestyle amenities and local favorites. Our agents live in these communities and know them inside out.
          </p>
        </Container>
      </div>

      {/* County filter chips */}
      <div className="bg-white border-b border-slate-100">
        <Container className="py-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 font-medium shrink-0">Filter by county:</span>
            <div className="flex flex-wrap gap-2">
              {counties.map((county) => (
                <span key={county} className="px-3 py-1.5 rounded-full bg-navy-50 text-navy-700 text-xs font-semibold">
                  {county} County
                </span>
              ))}
            </div>
          </div>
        </Container>
      </div>

      {/* Community cards */}
      <section className="section-padding bg-cream-50">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMMUNITIES.map((community) => (
              <Link
                key={community.slug}
                href={`/communities/${community.slug}`}
                className="group relative bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={community.imageUrl}
                    alt={community.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-navy-700">
                      {community.county} County
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <h2 className="font-serif text-2xl font-bold text-white drop-shadow-md">{community.name}</h2>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-500 italic mb-3">{community.tagline}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-navy-700 font-semibold">{community.stats.medianPrice} <span className="text-slate-400 font-normal">median</span></span>
                    <div className="h-3 w-px bg-slate-200" />
                    <span className="text-navy-700 font-semibold">{community.stats.avgDaysOnMarket}d <span className="text-slate-400 font-normal">avg DOM</span></span>
                    <div className="h-3 w-px bg-slate-200" />
                    <span className="text-navy-700 font-semibold">{community.stats.population} <span className="text-slate-400 font-normal">pop.</span></span>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-sm font-semibold text-crimson-600 group-hover:text-crimson-700 transition-colors">
                    <span>Explore Community</span>
                    <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <CtaBanner
        eyebrow="Not Sure Where to Start?"
        title="Talk to a Local Expert"
        subtitle="Our agents live and work in these communities. They'll help you find the perfect neighborhood for your lifestyle."
        primaryCta={{ label: "Find an Agent", href: "/agents" }}
        secondaryCta={{ label: "Search Properties", href: "/properties" }}
      />
    </>
  );
}
