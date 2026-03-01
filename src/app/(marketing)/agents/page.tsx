import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { AgentGrid } from "@/components/agents/agent-grid";
import { AgentFilters } from "@/components/agents/agent-filters";
import { Pagination } from "@/components/ui/pagination";
import { CtaBanner } from "@/components/shared/cta-banner";
import { createMetadata } from "@/lib/metadata";
import { AGENT_COUNT } from "@/lib/constants";
import {
  MOCK_AGENTS,
  AVAILABLE_LANGUAGES,
  filterAgents,
} from "@/data/mock/agents";

export const metadata: Metadata = createMetadata({
  title: "Find an Agent",
  description: `Browse our directory of ${AGENT_COUNT} licensed real estate agents serving Central Florida. Filter by language, name, or specialty.`,
  path: "/agents",
});

function getActiveLetters(): string[] {
  const letters = new Set(
    MOCK_AGENTS.filter((a) => a.active).map((a) =>
      a.lastName.charAt(0).toUpperCase()
    )
  );
  return [...letters].sort();
}

interface AgentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const params = await searchParams;

  const language =
    typeof params.language === "string" ? params.language : undefined;
  const letter =
    typeof params.letter === "string" ? params.letter : undefined;
  const search =
    typeof params.search === "string" ? params.search : undefined;
  const page =
    typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10)) : 1;

  const { agents, total, totalPages } = filterAgents({
    language,
    letter,
    search,
    page,
    perPage: 12,
  });

  const activeLetters = getActiveLetters();

  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="agent-dots"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#agent-dots)" />
          </svg>
        </div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-crimson-600/8 rounded-full blur-3xl" />
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-navy-400/10 rounded-full blur-2xl" />

        <Container className="pt-16 pb-14 relative z-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            Our Team
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight mb-4 max-w-3xl">
            Find Your Agent
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            {AGENT_COUNT} licensed agents across five Central Florida counties.
            Every one of them lives and works in the community they serve.
          </p>
        </Container>
      </div>

      {/* Directory */}
      <section className="section-padding bg-cream-50">
        <Container>
          <AgentFilters
            availableLanguages={AVAILABLE_LANGUAGES}
            activeLetters={activeLetters}
            currentLanguage={language}
            currentLetter={letter}
            currentSearch={search}
            totalCount={total}
          />

          <div className="mt-8">
            <AgentGrid agents={agents} />
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              className="mt-10"
            />
          )}
        </Container>
      </section>

      <CtaBanner
        eyebrow="Can't Find the Right Agent?"
        title="We'll Match You"
        subtitle="Tell us what you need and we'll connect you with the specialist for your area and situation."
        primaryCta={{ label: "Contact Us", href: "/about#contact" }}
        secondaryCta={{ label: "Call (407) 712-2000", href: "tel:4077122000" }}
        variant="navy"
      />
    </>
  );
}
