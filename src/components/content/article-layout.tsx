import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface RelatedLink {
  label: string;
  href: string;
}

interface ArticleLayoutProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  breadcrumbs: Breadcrumb[];
  relatedLinks?: RelatedLink[];
  ctaTitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  accentColor?: "navy" | "crimson";
  children: React.ReactNode;
}

export function ArticleLayout({
  title,
  subtitle,
  eyebrow,
  breadcrumbs,
  relatedLinks = [],
  ctaTitle = "Ready to Get Started?",
  ctaHref = "/home-evaluation",
  ctaLabel = "Free Home Evaluation",
  accentColor = "crimson",
  children,
}: ArticleLayoutProps) {
  return (
    <>
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        {/* Background geometric pattern */}
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Crimson accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-slate-200 transition-colors">Home</Link>
              </li>
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-2">
                  <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-slate-200 transition-colors">{crumb.label}</Link>
                  ) : (
                    <span className="text-slate-300">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {eyebrow && (
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">{subtitle}</p>
          )}
        </Container>
      </div>

      {/* Body */}
      <div className="bg-white">
        <Container className="py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 xl:gap-16 items-start">
            {/* Main content */}
            <article
              className={cn(
                "prose prose-slate prose-lg max-w-none",
                "prose-headings:font-serif prose-headings:text-navy-700 prose-headings:font-semibold",
                "prose-p:text-slate-600 prose-p:leading-relaxed",
                "prose-strong:text-navy-700",
                "prose-a:text-crimson-600 prose-a:no-underline hover:prose-a:underline",
                "prose-li:text-slate-600",
                accentColor === "crimson"
                  ? "prose-hr:border-crimson-100"
                  : "prose-hr:border-navy-100"
              )}
            >
              {children}
            </article>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-6">
              {/* Related articles */}
              {relatedLinks.length > 0 && (
                <div className="bg-cream-50 rounded-2xl p-6 border border-cream-200">
                  <h2 className="font-serif text-base font-semibold text-navy-700 mb-4 flex items-center gap-2">
                    <span className="h-1 w-4 bg-crimson-600 rounded-full inline-block" />
                    Related Articles
                  </h2>
                  <ul className="space-y-2">
                    {relatedLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-navy-700 transition-colors group py-1"
                        >
                          <svg className="h-3.5 w-3.5 text-crimson-500 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Box */}
              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <div className="h-10 w-10 rounded-xl bg-crimson-600 flex items-center justify-center mb-4">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-semibold mb-2">{ctaTitle}</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Connect with one of our expert agents and take the next step today.
                </p>
                <Link
                  href={ctaHref}
                  className="block w-full text-center px-4 py-2.5 rounded-lg bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors"
                >
                  {ctaLabel}
                </Link>
                <Link
                  href="/agents"
                  className="block w-full text-center px-4 py-2.5 rounded-lg border border-navy-500 text-slate-300 text-sm font-medium hover:bg-navy-600 transition-colors mt-2"
                >
                  Find an Agent
                </Link>
              </div>

              {/* Contact box */}
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
      </div>

      <CtaBanner
        title="Your Expert Agents Are Ready"
        subtitle="Over 186 licensed agents serving Central Florida — find yours today."
        primaryCta={{ label: "Find an Agent", href: "/agents" }}
        secondaryCta={{ label: "Contact Us", href: "/about#contact" }}
        variant="navy"
      />
    </>
  );
}
