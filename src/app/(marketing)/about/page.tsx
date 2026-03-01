import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { createMetadata } from "@/lib/metadata";
import { PHONE, EMAIL, ADDRESS, SERVICE_AREAS, AGENT_COUNT, YEARS_IN_BUSINESS } from "@/lib/constants";

export const metadata: Metadata = createMetadata({
  title: "About Home Wise Realty Group",
  description: "Central Florida's trusted real estate brokerage with 186+ agents serving five counties. Our mission: guide every client to the right decision.",
  path: "/about",
});

const STATS = [
  { value: AGENT_COUNT, label: "Licensed Agents" },
  { value: YEARS_IN_BUSINESS, label: "Years in Business" },
  { value: "5", label: "Counties Served" },
  { value: "1,000+", label: "Closings Per Year" },
];

const VALUES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Integrity First",
    body: "We represent your interests honestly — even when that means advising you not to buy a particular property.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Hyper-Local Expertise",
    body: "Our agents live and work in the neighborhoods they serve. They know which streets to seek and which to avoid.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Full Brokerage Support",
    body: "Over 186 agents backed by experienced brokers, transaction coordinators, and marketing professionals.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "Communication You Can Count On",
    body: "We set expectations at the start and hold to them. You'll never wonder where your transaction stands.",
  },
];

const SERVICES = {
  buyers: [
    "Free buyer consultations",
    "Pre-approval lender referrals",
    "Off-market listing access",
    "Negotiation and offer strategy",
    "Due diligence management",
    "Closing day coordination",
  ],
  sellers: [
    "Free comparative market analysis",
    "Professional photography included",
    "Maximum MLS and digital exposure",
    "Showing management and feedback",
    "Offer analysis and negotiation",
    "Pre-listing home preparation guidance",
  ],
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[400px] md:h-[480px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80"
          alt="Home Wise Realty Group office"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-900/75 to-navy-950/40" />
        <div className="absolute inset-0 flex items-center">
          <Container>
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-2 text-xs text-slate-400">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li className="flex items-center gap-2">
                  <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-slate-300">About</span>
                </li>
              </ol>
            </nav>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">About Us</p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-white leading-tight mb-4 max-w-2xl">
              Central Florida&apos;s<br />
              <span className="italic text-cream-100">Trusted Brokerage</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-xl leading-relaxed">
              {AGENT_COUNT} agents. {YEARS_IN_BUSINESS} years. Five counties. One mission: guide every client to the right decision.
            </p>
          </Container>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-crimson-600">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-crimson-700">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-crimson-600 text-center py-6 px-4">
                <p className="font-serif text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-crimson-200 text-xs font-medium tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* Mission */}
      <section className="section-padding bg-white">
        <Container size="md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Our Mission</p>
              <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-6 leading-tight">
                We Don&apos;t Just Sell Homes.<br />We Build Long-Term Trust.
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Home Wise Realty Group was founded on a simple principle: real estate clients deserve honest guidance
                from agents who know their community deeply — not transaction-focused salespeople chasing commissions.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                Our brokers built this company by recruiting agents who share that philosophy. Today, with over {AGENT_COUNT} agents
                across Central Florida, we&apos;re large enough to have deep market coverage but focused enough to give
                every client personalized service.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Whether you&apos;re buying your first home in Kissimmee, selling a lakefront estate in Windermere, or
                relocating to Orlando for work — we have a specialist who lives and breathes your target market.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-elevated">
                <Image
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=75"
                  alt="Home Wise agents collaborating"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-navy-700 text-white rounded-xl p-4 shadow-elevated">
                <p className="font-serif text-3xl font-bold mb-0.5">{AGENT_COUNT}</p>
                <p className="text-slate-300 text-xs">Licensed Agents</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Service Areas */}
      <section className="section-padding bg-cream-50">
        <Container>
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Where We Work</p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-4">Serving All of Central Florida</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              We have active agents in every major Central Florida county — not a general coverage area, but dedicated specialists in each market.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {SERVICE_AREAS.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-navy-700 font-medium text-sm shadow-card"
              >
                <span className="h-2 w-2 rounded-full bg-crimson-600" />
                {area}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="section-padding bg-white">
        <Container>
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">What We Stand For</p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-4">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((value) => (
              <div key={value.title} className="p-6 rounded-2xl border border-slate-100 shadow-card">
                <div className="h-12 w-12 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="font-serif text-lg font-semibold text-navy-700 mb-2">{value.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{value.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Services */}
      <section className="section-padding bg-navy-700">
        <Container>
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">What We Offer</p>
            <h2 className="font-serif text-display-md font-semibold text-white mb-4">Full-Service Real Estate</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Whether you&apos;re on the buy side or the sell side, our agents provide end-to-end representation with no shortcuts.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {Object.entries(SERVICES).map(([key, items]) => (
              <div key={key} className="bg-navy-800 rounded-2xl p-7">
                <h3 className="font-serif text-xl font-semibold text-white mb-5">
                  {key === "buyers" ? "For Buyers" : "For Sellers"}
                </h3>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <svg className="h-4 w-4 text-crimson-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={key === "buyers" ? "/buyers" : "/sellers"}
                  className="inline-flex items-center gap-2 mt-6 text-sm text-crimson-400 hover:text-crimson-300 font-medium transition-colors"
                >
                  {key === "buyers" ? "Buyer Resources" : "Seller Resources"}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Contact */}
      <section id="contact" className="section-padding bg-cream-50">
        <Container size="md">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">Get in Touch</p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-4">We&apos;re Here to Help</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Reach out any time. Our team responds within one business day — usually the same day.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                label: "Phone",
                value: PHONE,
                href: `tel:${PHONE.replace(/\D/g, "")}`,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ),
              },
              {
                label: "Email",
                value: EMAIL,
                href: `mailto:${EMAIL}`,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                label: "Office",
                value: ADDRESS.full,
                href: `https://maps.google.com/?q=${encodeURIComponent(ADDRESS.full)}`,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.label === "Office" ? "_blank" : undefined}
                rel={item.label === "Office" ? "noopener noreferrer" : undefined}
                className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-elevated transition-shadow group"
              >
                <div className="h-12 w-12 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center mb-4 group-hover:bg-crimson-600 group-hover:text-white transition-colors">
                  {item.icon}
                </div>
                <p className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-1">{item.label}</p>
                <p className="text-sm text-navy-700 font-medium">{item.value}</p>
              </a>
            ))}
          </div>

          {/* Contact form placeholder — Phase 6 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-cream-100 text-navy-400 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="font-serif text-xl font-semibold text-navy-700 mb-2">Send a Message</h3>
            <p className="text-slate-500 text-sm mb-4">
              Contact form coming soon. In the meantime, call or email us directly.
            </p>
            <a
              href={`tel:${PHONE.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors"
            >
              Call {PHONE}
            </a>
          </div>
        </Container>
      </section>

      <CtaBanner
        eyebrow="Work With Us"
        title="Find Your Home Wise Agent"
        subtitle="Browse our directory of 186+ local experts and find the specialist for your area."
        primaryCta={{ label: "Find an Agent", href: "/agents" }}
        secondaryCta={{ label: "Search Properties", href: "/properties" }}
        variant="navy"
      />
    </>
  );
}
