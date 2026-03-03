import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Pagination } from "@/components/ui/pagination";
import { CtaBanner } from "@/components/shared/cta-banner";
import { IdxDisclaimer } from "@/components/properties/idx-disclaimer";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { createMetadata } from "@/lib/metadata";

interface AgentListingsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: AgentListingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const agent = await prisma.agent.findFirst({
    where: { slug, active: true },
    select: { firstName: true, lastName: true },
  });

  if (!agent) {
    return createMetadata({ title: "Agent Not Found", path: `/agents/${slug}/listings` });
  }

  const fullName = `${agent.firstName} ${agent.lastName}`;
  return createMetadata({
    title: `${fullName} — Listings`,
    description: `Browse all active and pending listings by ${fullName} at Home Wise Realty Group.`,
    path: `/agents/${slug}/listings`,
  });
}

const PER_PAGE = 12;

export default async function AgentListingsPage({ params, searchParams }: AgentListingsPageProps) {
  const { slug } = await params;
  const rawParams = await searchParams;

  const agent = await prisma.agent.findFirst({
    where: { slug, active: true },
    select: { id: true, firstName: true, lastName: true, mlsAgentId: true, slug: true },
  });

  if (!agent || !agent.mlsAgentId) {
    notFound();
  }

  const page = Math.max(1, parseInt(String(rawParams.page ?? "1"), 10) || 1);
  const where = { listingAgentMlsId: agent.mlsAgentId, status: { in: ["Active", "Pending"] } };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { price: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.listing.count({ where }),
  ]);

  const fullName = `${agent.firstName} ${agent.lastName}`;
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="agent-listings-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#agent-listings-grid)" />
          </svg>
        </div>

        <Container className="pt-12 pb-10 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-slate-200 transition-colors">Home</Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link href="/agents" className="hover:text-slate-200 transition-colors">Agents</Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link href={`/agents/${agent.slug}`} className="hover:text-slate-200 transition-colors">
                  {fullName}
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-300">Listings</span>
              </li>
            </ol>
          </nav>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            Agent Listings
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white leading-tight mb-2">
            {fullName}&apos;s Listings
          </h1>
          <p className="text-slate-300 text-lg">
            {total} active {total === 1 ? "listing" : "listings"}
          </p>
        </Container>
      </div>

      <section className="section-padding bg-cream-50">
        <Container>
          {listings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">No active listings at this time.</p>
              <Link
                href={`/agents/${agent.slug}`}
                className="inline-block mt-4 text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors"
              >
                Back to {fullName}&apos;s profile
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/properties/${listing.id}`}
                    className="group bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden hover:shadow-elevated transition-shadow"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {listing.imageUrl && (
                        <Image
                          src={listing.imageUrl}
                          alt={listing.address}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-serif text-lg font-bold text-navy-700 group-hover:text-crimson-600 transition-colors">
                        {formatPrice(listing.price)}
                      </p>
                      <p className="text-sm text-slate-600 truncate">{listing.address}</p>
                      <p className="text-xs text-slate-400">
                        {listing.city}, {listing.state} {listing.zip}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{listing.beds} bd</span>
                        <span>{listing.baths} ba</span>
                        <span>{listing.sqft.toLocaleString()} sqft</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination currentPage={page} totalPages={totalPages} className="mt-10" />
            </>
          )}

          <IdxDisclaimer />
        </Container>
      </section>

      <CtaBanner
        eyebrow="Looking for Something Specific?"
        title="Search All Properties"
        subtitle="Browse the full MLS with advanced filters, map search, and more."
        primaryCta={{ label: "Property Search", href: "/properties" }}
        secondaryCta={{ label: "Contact Agent", href: `/agents/${agent.slug}` }}
      />
    </>
  );
}
