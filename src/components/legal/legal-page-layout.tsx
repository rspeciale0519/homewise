import React from "react";
import { Container } from "@/components/ui/container";

interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

function TableOfContents({ sections }: { sections: LegalSection[] }) {
  return (
    <ul className="space-y-1">
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="block py-1.5 px-3 text-sm text-navy-600 rounded-md hover:bg-navy-50 hover:text-navy-800 transition-colors leading-snug"
          >
            {section.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function LegalPageLayout({ title, lastUpdated, sections }: LegalPageLayoutProps) {
  return (
    <div className="scroll-smooth">
      {/* Hero banner */}
      <div className="bg-navy-700 py-16 md:py-20 lg:py-24">
        <Container size="lg">
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-white leading-tight mb-4">
            {title}
          </h1>
          <p className="text-slate-300 text-base">Last Updated: {lastUpdated}</p>
        </Container>
      </div>

      {/* Body */}
      <div className="bg-cream-50 min-h-screen">
        <Container size="lg">
          <div className="py-12 lg:py-16">
            {/* Mobile TOC */}
            <div className="lg:hidden mb-8">
              <details className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
                <summary className="px-5 py-4 font-serif text-base font-semibold text-navy-700 cursor-pointer select-none list-none flex items-center justify-between">
                  Table of Contents
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                  <TableOfContents sections={sections} />
                </div>
              </details>
            </div>

            {/* Two-column layout */}
            <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 xl:gap-16">
              {/* Sidebar TOC — desktop only */}
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <p className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-3 px-3">
                    Contents
                  </p>
                  <TableOfContents sections={sections} />
                </div>
              </aside>

              {/* Content */}
              <article>
                <div className="space-y-0">
                  {sections.map((section, index) => (
                    <div key={section.id}>
                      <section
                        id={section.id}
                        className="scroll-mt-28 py-8"
                      >
                        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy-700 mb-5 leading-snug">
                          {section.title}
                        </h2>
                        <div className="space-y-4 text-base leading-relaxed text-slate-600">
                          {section.content}
                        </div>
                      </section>

                      {index < sections.length - 1 && (
                        <hr className="border-slate-200" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Back to top */}
                <div className="mt-10 pt-8 border-t border-slate-200">
                  <a
                    href="#"
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy-600 hover:text-crimson-600 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Back to top
                  </a>
                </div>
              </article>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
