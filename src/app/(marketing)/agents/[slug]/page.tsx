import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { createMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import { PHONE } from "@/lib/constants";
import { AgentListingsWidget } from "@/components/agents/agent-listings-widget";
import { JsonLdScript } from "@/components/shared/json-ld-script";
import { agentPersonJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";

interface AgentProfileProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: { slug: true },
  });
  return agents.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: AgentProfileProps): Promise<Metadata> {
  const { slug } = await params;
  const agent = await prisma.agent.findFirst({
    where: { slug, active: true },
    select: { firstName: true, lastName: true },
  });

  if (!agent) {
    return createMetadata({
      title: "Agent Not Found",
      path: `/agents/${slug}`,
    });
  }

  const fullName = `${agent.firstName} ${agent.lastName}`;
  return createMetadata({
    title: `${fullName} — Real Estate Agent`,
    description: `Connect with ${fullName}, a licensed real estate agent at Home Wise Realty Group serving Central Florida.`,
    path: `/agents/${slug}`,
  });
}

export default async function AgentProfilePage({ params }: AgentProfileProps) {
  const { slug } = await params;
  const agent = await prisma.agent.findFirst({
    where: { slug, active: true },
  });

  if (!agent) {
    notFound();
  }

  const fullName = `${agent.firstName} ${agent.lastName}`;
  const initials = `${agent.firstName.charAt(0)}${agent.lastName.charAt(0)}`;

  return (
    <>
      <JsonLdScript data={[
        agentPersonJsonLd(agent),
        breadcrumbJsonLd([
          { name: "Home", href: "/" },
          { name: "Agents", href: "/agents" },
          { name: fullName, href: `/agents/${slug}` },
        ]),
      ]} />
      {/* Hero — split layout */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="profile-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#profile-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-crimson-600/8 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />

        <Container className="relative z-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="pt-8 mb-8">
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
                <span className="text-slate-300">{fullName}</span>
              </li>
            </ol>
          </nav>

          {/* Profile header */}
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[340px_1fr] gap-8 lg:gap-12 pb-12">
            {/* Photo */}
            <div className="relative">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-elevated ring-1 ring-white/10">
                {agent.photoUrl ? (
                  <Image
                    src={agent.photoUrl}
                    alt={fullName}
                    fill
                    priority
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 340px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center">
                    <span className="font-serif text-7xl font-bold text-white/20">{initials}</span>
                  </div>
                )}
              </div>
              {/* Accent corner */}
              <div className="absolute -bottom-3 -right-3 h-20 w-20 rounded-xl bg-crimson-600/20 -z-10 blur-xl" />
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-2">
                Licensed Agent
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-white leading-tight mb-4">
                {fullName}
              </h1>

              {/* Designations */}
              {agent.designations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {agent.designations.map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1 text-xs font-semibold tracking-widest uppercase text-slate-300 border border-slate-500/40 rounded-lg"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {/* Contact info */}
              <div className="space-y-3">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone.replace(/\D/g, "")}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-crimson-600 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{agent.phone}</span>
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-crimson-600 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{agent.email}</span>
                  </a>
                )}
              </div>

              {/* Languages */}
              {agent.languages.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 mb-2">
                    Languages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agent.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-3 py-1 text-xs font-medium bg-white/10 text-slate-200 rounded-full"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Bio section */}
      <section className="section-padding bg-white">
        <Container size="md">
          <AnimateOnScroll>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 xl:gap-16 items-start">
            {/* Bio */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-crimson-600 rounded-full" />
                <h2 className="font-serif text-2xl font-semibold text-navy-700">
                  About {agent.firstName}
                </h2>
              </div>
              <div className="prose prose-slate prose-lg max-w-none prose-p:text-slate-600 prose-p:leading-relaxed">
                {agent.bio?.split("\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-6">
              {/* Contact CTA */}
              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <h3 className="font-serif text-lg font-semibold mb-2">
                  Work With {agent.firstName}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Ready to start your real estate journey? Reach out directly or
                  let us connect you.
                </p>
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone.replace(/\D/g, "")}`}
                    className="block w-full text-center px-4 py-2.5 rounded-lg bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors mb-2"
                  >
                    Call {agent.phone}
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="block w-full text-center px-4 py-2.5 rounded-lg border border-navy-500 text-slate-300 text-sm font-medium hover:bg-navy-600 transition-colors"
                  >
                    Send Email
                  </a>
                )}
              </div>

              {/* Office contact */}
              <div className="rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-3">
                  Home Wise Office
                </p>
                <a
                  href={`tel:${PHONE.replace(/\D/g, "")}`}
                  className="flex items-center gap-2 text-navy-700 font-semibold hover:text-navy-900 transition-colors"
                >
                  <svg className="h-4 w-4 text-crimson-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {PHONE}
                </a>
              </div>

              {/* Back to directory */}
              <Link
                href="/agents"
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-navy-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Back to Agent Directory
              </Link>
            </aside>
          </div>
          </AnimateOnScroll>
        </Container>
      </section>

      {/* MLS Listings */}
      {agent.mlsAgentId && (
        <section className="section-padding bg-cream-50">
          <Container>
            <Suspense fallback={null}>
              <AgentListingsWidget
                mlsAgentId={agent.mlsAgentId}
                agentSlug={agent.slug}
              />
            </Suspense>
          </Container>
        </section>
      )}

      <CtaBanner
        eyebrow="Looking for a Different Specialist?"
        title="Browse All Agents"
        subtitle="Filter by language, area of expertise, or name to find the right match."
        primaryCta={{ label: "View All Agents", href: "/agents" }}
        secondaryCta={{ label: "Home Evaluation", href: "/home-evaluation" }}
        variant="navy"
      />
    </>
  );
}
