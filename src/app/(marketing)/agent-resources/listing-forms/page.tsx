import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { DocumentList } from "@/components/content/document-list";
import { LISTING_FORMS } from "@/data/content/agent-resources";

export const metadata: Metadata = {
  title: "Listing Forms",
  description:
    "Download listing forms for Home Wise Realty Group agents — MLS data entry forms, listing agreements, property disclosures, addendums, and riders.",
};

export default function ListingFormsPage() {
  const totalDocs = LISTING_FORMS.reduce(
    (acc, cat) => acc + cat.documents.length,
    0
  );

  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lf-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lf-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-slate-200 transition-colors">Home</Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link href="/agent-resources" className="hover:text-slate-200 transition-colors">Agent Resources</Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-300">Listing Forms</span>
              </li>
            </ol>
          </nav>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            Agent Resources
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-white leading-tight mb-4">
            Listing Forms
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            {totalDocs} listing documents — data entry forms, listing agreements, property disclosures, and addendums.
          </p>
        </Container>
      </div>

      <div className="bg-white">
        <Container className="py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 xl:gap-16 items-start">
            <DocumentList categories={LISTING_FORMS} />

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-6">
              <div className="bg-navy-50 rounded-2xl p-6 border border-navy-100">
                <h2 className="font-serif text-base font-semibold text-navy-700 mb-4 flex items-center gap-2">
                  <span className="h-1 w-4 bg-crimson-600 rounded-full inline-block" />
                  Other Document Libraries
                </h2>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/agent-resources/office-forms"
                      className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-navy-700 transition-colors group py-1"
                    >
                      <svg className="h-3.5 w-3.5 text-crimson-500 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                      Office Forms
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/agent-resources/sales-forms"
                      className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-navy-700 transition-colors group py-1"
                    >
                      <svg className="h-3.5 w-3.5 text-crimson-500 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                      Sales Forms
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <div className="h-10 w-10 rounded-xl bg-crimson-600 flex items-center justify-center mb-4">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-semibold mb-2">Transaction Desk</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  All forms are also available through Transaction Desk for the most up-to-date versions.
                </p>
                <Link
                  href="/agent-resources"
                  className="block w-full text-center px-4 py-2.5 rounded-lg border border-navy-500 text-slate-300 text-sm font-medium hover:bg-navy-600 transition-colors"
                >
                  All Resources
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-3">Office</p>
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
      </div>

      <CtaBanner
        title="Need Help?"
        subtitle="Contact the office for assistance with any forms or documents."
        primaryCta={{ label: "Contact Us", href: "/about#contact" }}
        secondaryCta={{ label: "Back to Resources", href: "/agent-resources" }}
        variant="navy"
      />
    </>
  );
}
