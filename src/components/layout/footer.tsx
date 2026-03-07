import Link from "next/link";
import Image from "next/image";
import { SITE_NAME, PHONE, EMAIL, ADDRESS, SERVICE_AREAS } from "@/lib/constants";
import { SocialLinks } from "@/components/shared/social-links";
import { Container } from "@/components/ui/container";

const sellerLinks = [
  { label: "Seller Resources", href: "/sellers" },
  { label: "Home Staging Tips", href: "/sellers/staging" },
  { label: "Sell Your Home Fast", href: "/sellers/sell-fast" },
  { label: "Sounds & Smells", href: "/sellers/sounds-and-smells" },
  { label: "Seller Advice", href: "/sellers/seller-advice" },
  { label: "Free Home Evaluation", href: "/home-evaluation" },
];

const buyerLinks = [
  { label: "Buyer Resources", href: "/buyers" },
  { label: "Preparing to Buy", href: "/buyers/preparing" },
  { label: "Choosing a Location", href: "/buyers/location" },
  { label: "Moving Tips", href: "/buyers/moving-tips" },
  { label: "Condo vs. House", href: "/buyers/condo-vs-house" },
];

const quickLinks = [
  { label: "Find an Agent", href: "/agents" },
  { label: "Search Properties", href: "/properties" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/about#contact" },
  { label: "Free Home Evaluation", href: "/home-evaluation" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-700 text-slate-300">
      {/* Main footer grid */}
      <Container className="pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Column 1: Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/images/logo.png"
                alt={SITE_NAME}
                width={160}
                height={54}
                className="h-12 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-xs">
              Central Florida&apos;s trusted real estate brokerage serving families across{" "}
              {SERVICE_AREAS.slice(0, 3).join(", ")}, and more.
            </p>
            <SocialLinks light size="sm" />
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 hover:text-white transition-colors duration-150 hover:translate-x-0.5 inline-flex items-center gap-1.5 group"
                  >
                    <span className="h-px w-3 bg-crimson-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: For Sellers */}
          <div>
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-4">
              For Sellers
            </h3>
            <ul className="space-y-2.5">
              {sellerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 hover:text-white transition-colors duration-150 inline-flex items-center gap-1.5 group"
                  >
                    <span className="h-px w-3 bg-crimson-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: For Buyers */}
          <div>
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-4">
              For Buyers
            </h3>
            <ul className="space-y-2.5">
              {buyerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 hover:text-white transition-colors duration-150 inline-flex items-center gap-1.5 group"
                  >
                    <span className="h-px w-3 bg-crimson-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      {/* Contact bar */}
      <div>
        <Container className="pt-2 pb-8">
          <div className="flex items-center justify-center mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-navy-500/40 to-transparent" />
            <span className="px-5 text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">Contact</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-navy-500/40 to-transparent" />
          </div>
          <address className="not-italic flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 lg:gap-16">
            <a
              href={`tel:${PHONE.replace(/\D/g, "")}`}
              className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white transition-colors group"
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-navy-600/80 group-hover:bg-crimson-600/20 transition-colors">
                <svg className="h-4 w-4 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </span>
              {PHONE}
            </a>
            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white transition-colors group"
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-navy-600/80 group-hover:bg-crimson-600/20 transition-colors">
                <svg className="h-4 w-4 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              {EMAIL}
            </a>
            <span className="flex items-center gap-2.5 text-sm text-slate-400">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-navy-600/80">
                <svg className="h-4 w-4 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              {ADDRESS.full}
            </span>
          </address>
        </Container>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-navy-600">
        <Container className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
              <span>© {year} {SITE_NAME}. All rights reserved.</span>
              <span className="hidden md:inline text-navy-500">•</span>
              <span>Licensed Real Estate Brokerage · Florida</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link href="/terms-of-service" className="text-slate-400 hover:text-slate-300 transition-colors">Terms of Service</Link>
              <span className="text-navy-500">·</span>
              <Link href="/privacy-policy" className="text-slate-400 hover:text-slate-300 transition-colors">Privacy Policy</Link>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-slate-400 font-medium">REALTOR<sup>®</sup></span>
              <span className="text-slate-400">Equal Housing Opportunity</span>
              <span className="text-slate-400">MLS Member</span>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
