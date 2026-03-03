import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CtaBanner } from "@/components/shared/cta-banner";
import { propertyProvider } from "@/providers";
import { formatPrice } from "@/lib/format";
import { createMetadata } from "@/lib/metadata";
import { PHONE } from "@/lib/constants";

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PropertyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await propertyProvider.getProperty(id);
  if (!property) return createMetadata({ title: "Property Not Found", path: "/properties" });

  return createMetadata({
    title: `${property.address}, ${property.city} — ${formatPrice(property.price)}`,
    description: `${property.beds} bed, ${property.baths} bath, ${property.sqft.toLocaleString()} sq ft ${property.propertyType.toLowerCase()} in ${property.city}, FL ${property.zip}. Listed at ${formatPrice(property.price)}.`,
    path: `/properties/${id}`,
  });
}

const statusVariant: Record<string, "success" | "crimson" | "gold"> = {
  "For Sale": "success",
  "New Listing": "crimson",
  "Pending": "gold",
};

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const property = await propertyProvider.getProperty(id);

  if (!property) notFound();

  return (
    <>
      {/* Breadcrumb bar */}
      <div className="bg-cream-50 border-b border-cream-200">
        <Container className="py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-xs text-slate-500">
              <li><Link href="/" className="hover:text-navy-700 transition-colors">Home</Link></li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <Link href="/properties" className="hover:text-navy-700 transition-colors">Properties</Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-navy-700 font-medium truncate max-w-[200px]">{property.address}</span>
              </li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* Hero image */}
      <div className="relative aspect-[21/9] md:aspect-[3/1] bg-slate-100 overflow-hidden">
        <Image
          src={property.imageUrl}
          alt={`${property.address}, ${property.city}`}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0">
          <Container className="pb-6 md:pb-8">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <Badge variant={statusVariant[property.status] ?? "default"} size="lg" className="mb-3 shadow-sm">
                  {property.status}
                </Badge>
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-1">
                  {formatPrice(property.price)}
                </h1>
                <p className="text-white/90 text-lg drop-shadow-md">
                  {property.address}, {property.city}, {property.state} {property.zip}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/agents">
                  <Button variant="outline-white" size="md">Contact Agent</Button>
                </Link>
                <Link href={`tel:${PHONE.replace(/[^0-9+]/g, "")}`}>
                  <Button variant="crimson" size="md">Call {PHONE}</Button>
                </Link>
              </div>
            </div>
          </Container>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <Container>
          <div className="flex items-center gap-6 sm:gap-10 py-4 overflow-x-auto">
            <StatItem label="Bedrooms" value={String(property.beds)} />
            <Divider />
            <StatItem label="Bathrooms" value={String(property.baths)} />
            <Divider />
            <StatItem label="Sq Ft" value={property.sqft.toLocaleString()} />
            {property.garage > 0 && (
              <>
                <Divider />
                <StatItem label="Garage" value={String(property.garage)} />
              </>
            )}
            <Divider />
            <StatItem label="Type" value={property.propertyType} />
            <Divider />
            <StatItem label="Days on Market" value={String(property.daysOnMarket)} />
          </div>
        </Container>
      </div>

      {/* Main content */}
      <section className="section-padding bg-cream-50">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 xl:gap-14 items-start">
            {/* Left: Details */}
            <div className="space-y-8">
              {/* Overview */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Property Overview</h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Welcome to {property.address} in {property.city}, FL — a beautifully maintained {property.sqft.toLocaleString()} square foot {property.propertyType.toLowerCase()} offering {property.beds} bedrooms and {property.baths} bathrooms. This property is currently listed at {formatPrice(property.price)} and has been on the market for {property.daysOnMarket} days.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <DetailItem label="Property Type" value={property.propertyType} />
                  <DetailItem label="Bedrooms" value={`${property.beds}`} />
                  <DetailItem label="Bathrooms" value={`${property.baths}`} />
                  <DetailItem label="Square Feet" value={property.sqft.toLocaleString()} />
                  <DetailItem label="Garage Spaces" value={`${property.garage}`} />
                  <DetailItem label="Days on Market" value={`${property.daysOnMarket}`} />
                  <DetailItem label="Status" value={property.status} />
                  <DetailItem label="City" value={property.city} />
                  <DetailItem label="Zip Code" value={property.zip} />
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Location</h2>
                <div className="bg-slate-100 rounded-xl aspect-[16/9] flex items-center justify-center">
                  <div className="text-center">
                    <svg className="h-12 w-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-slate-500 font-medium">{property.address}</p>
                    <p className="text-xs text-slate-400">{property.city}, {property.state} {property.zip}</p>
                    <p className="text-xs text-slate-400 mt-2">Interactive map coming soon</p>
                  </div>
                </div>
              </div>

              {/* Payment estimate */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Estimated Monthly Payment</h2>
                <PaymentEstimate price={property.price} />
              </div>
            </div>

            {/* Right: Sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-6">
              <div className="bg-navy-700 rounded-2xl p-6 text-white">
                <div className="h-10 w-10 rounded-xl bg-crimson-600 flex items-center justify-center mb-4">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-2">Interested in This Property?</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-5">
                  Contact one of our agents for more details, to schedule a showing, or to make an offer.
                </p>
                <Link href="/agents" className="block w-full text-center px-4 py-3 rounded-xl bg-crimson-600 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors mb-2">
                  Find an Agent
                </Link>
                <a href={`tel:${PHONE.replace(/[^0-9+]/g, "")}`} className="block w-full text-center px-4 py-3 rounded-xl border border-navy-500 text-slate-300 text-sm font-medium hover:bg-navy-600 transition-colors">
                  Call {PHONE}
                </a>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
                <h3 className="font-serif text-base font-semibold text-navy-700 mb-3">Schedule a Showing</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  Ready to see this property in person? Contact us to arrange a private showing at your convenience.
                </p>
                <Link href="/buyers/request" className="block w-full text-center px-4 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition-colors">
                  Request Showing
                </Link>
              </div>

              <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6">
                <h3 className="font-serif text-base font-semibold text-navy-700 mb-3">Selling Your Home?</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  Get a free Comparative Market Analysis to find out what your home is worth in today&apos;s market.
                </p>
                <Link href="/home-evaluation" className="block w-full text-center px-4 py-2.5 rounded-xl border-2 border-crimson-600 text-crimson-600 text-sm font-semibold hover:bg-crimson-600 hover:text-white transition-colors">
                  Free Home Evaluation
                </Link>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <CtaBanner
        eyebrow="Keep Searching"
        title="Explore More Properties"
        subtitle="Browse our full inventory of Central Florida homes for sale."
        primaryCta={{ label: "Back to Search", href: "/properties" }}
        secondaryCta={{ label: "Get Property Alerts", href: "/property-updates" }}
      />
    </>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center min-w-fit">
      <span className="font-serif text-xl font-bold text-navy-700">{value}</span>
      <span className="text-xs text-slate-500 mt-0.5">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-8 w-px bg-slate-200 shrink-0" />;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream-50 rounded-xl p-3.5">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-navy-700">{value}</p>
    </div>
  );
}

function PaymentEstimate({ price }: { price: number }) {
  const downPayment = price * 0.2;
  const loanAmount = price - downPayment;
  const monthlyRate = 0.065 / 12;
  const numPayments = 30 * 12;
  const monthly = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const tax = (price * 0.01) / 12;
  const insurance = 250;
  const total = monthly + tax + insurance;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-sm text-slate-600">Principal & Interest</span>
        <span className="text-sm font-semibold text-navy-700">${Math.round(monthly).toLocaleString()}/mo</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-sm text-slate-600">Property Taxes (est.)</span>
        <span className="text-sm font-semibold text-navy-700">${Math.round(tax).toLocaleString()}/mo</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-slate-100">
        <span className="text-sm text-slate-600">Insurance (est.)</span>
        <span className="text-sm font-semibold text-navy-700">${insurance}/mo</span>
      </div>
      <div className="flex justify-between items-center py-3 bg-navy-50 rounded-xl px-4 -mx-1">
        <span className="text-sm font-semibold text-navy-700">Estimated Total</span>
        <span className="font-serif text-xl font-bold text-crimson-600">${Math.round(total).toLocaleString()}/mo</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Based on 20% down ({formatPrice(downPayment)}), 6.5% interest rate, 30-year fixed mortgage.
        Actual payments will vary. Does not include HOA fees.
      </p>
    </div>
  );
}
