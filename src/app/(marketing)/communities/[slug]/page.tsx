import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { COMMUNITIES, getCommunityBySlug } from "@/data/content/communities";
import { createMetadata } from "@/lib/metadata";

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COMMUNITIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) return createMetadata({ title: "Community Not Found" });

  return createMetadata({
    title: `${community.name} Real Estate & Community Guide`,
    description: `Homes for sale in ${community.name}, FL. ${community.tagline}. Median price ${community.stats.medianPrice}, ${community.stats.avgDaysOnMarket} avg days on market. Local expert agents ready to help.`,
    path: `/communities/${slug}`,
  });
}

export default async function CommunityDetailPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);

  if (!community) notFound();

  const otherCommunities = COMMUNITIES.filter((c) => c.slug !== slug).slice(0, 4);

  return (
    <>
      {/* Hero */}
      <div className="relative h-[400px] md:h-[480px] overflow-hidden">
        <Image
          src={community.imageUrl}
          alt={community.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-900/60 to-navy-950/20" />
        <div className="absolute inset-0 flex items-center">
          <Container>
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-2 text-xs text-slate-400">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li className="flex items-center gap-2">
                  <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  <Link href="/communities" className="hover:text-white transition-colors">Communities</Link>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  <span className="text-slate-300">{community.name}</span>
                </li>
              </ol>
            </nav>
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold text-white mb-4">
              {community.county} County
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight mb-3">
              {community.name}
            </h1>
            <p className="text-slate-300 text-lg italic max-w-xl">{community.tagline}</p>
          </Container>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <Container>
          <div className="flex items-center justify-center gap-8 sm:gap-16 py-5">
            <div className="text-center">
              <p className="font-serif text-2xl font-bold text-navy-700">{community.stats.medianPrice}</p>
              <p className="text-xs text-slate-500 mt-1">Median Sale Price</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-center">
              <p className="font-serif text-2xl font-bold text-navy-700">{community.stats.avgDaysOnMarket}</p>
              <p className="text-xs text-slate-500 mt-1">Avg Days on Market</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="text-center">
              <p className="font-serif text-2xl font-bold text-navy-700">{community.stats.population}</p>
              <p className="text-xs text-slate-500 mt-1">Population</p>
            </div>
          </div>
        </Container>
      </div>

      {/* Main content */}
      <section className="section-padding bg-cream-50">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 xl:gap-14 items-start">
            <div className="space-y-8">
              {/* About */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">
                  About {community.name}
                </h2>
                <p className="text-slate-600 leading-relaxed">{community.description}</p>
              </div>

              {/* Highlights */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-5">
                  Community Highlights
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {community.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-3 bg-cream-50 rounded-xl p-4">
                      <svg className="h-4 w-4 text-crimson-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-slate-600 leading-relaxed">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* More communities */}
              <div>
                <h2 className="font-serif text-xl font-semibold text-navy-700 mb-4">
                  Explore Other Communities
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {otherCommunities.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/communities/${c.slug}`}
                      className="group flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3 hover:shadow-card transition-shadow"
                    >
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0">
                        <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="48px" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-700 group-hover:text-crimson-600 transition-colors">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.stats.medianPrice} median</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-6">
              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <h3 className="font-serif text-xl font-semibold mb-2">
                  Homes in {community.name}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-5">
                  Browse available homes for sale in {community.name}, FL. New listings added daily.
                </p>
                <Link
                  href={`/properties?location=${encodeURIComponent(community.name)}`}
                  className="block w-full text-center px-4 py-3 rounded-xl bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors"
                >
                  Search {community.name} Homes
                </Link>
                <Link
                  href="/agents"
                  className="block w-full text-center px-4 py-3 rounded-xl border border-navy-500 text-slate-300 text-sm font-medium hover:bg-navy-600 transition-colors mt-2"
                >
                  Find a Local Agent
                </Link>
              </div>

              <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
                <h3 className="font-serif text-base font-semibold text-navy-700 mb-3">
                  Get {community.name} Alerts
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  Be the first to know when new homes are listed in {community.name}.
                </p>
                <Link
                  href="/property-updates"
                  className="block w-full text-center px-4 py-2.5 rounded-xl border-2 border-crimson-600 text-crimson-600 text-sm font-semibold hover:bg-crimson-600 hover:text-white transition-colors"
                >
                  Set Up Alerts
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-3">Questions?</p>
                <a href="tel:4077122000" className="flex items-center gap-2 text-navy-700 font-semibold hover:text-navy-900 transition-colors">
                  <svg className="h-4 w-4 text-crimson-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  (407) 712-2000
                </a>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <CtaBanner
        eyebrow={`Living in ${community.name}`}
        title="Your Expert Agent Awaits"
        subtitle={`Our agents specialize in ${community.name} and ${community.county} County real estate. Get local insights that online searches can't provide.`}
        primaryCta={{ label: "Find an Agent", href: "/agents" }}
        secondaryCta={{ label: "Free Home Evaluation", href: "/home-evaluation" }}
      />
    </>
  );
}
