import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CtaBanner } from "@/components/shared/cta-banner";
import { PhotoGallery } from "@/components/properties/photo-gallery";
import { ListingDetailOverview } from "@/components/properties/listing-detail-overview";
import { ListingDetailLocation } from "@/components/properties/listing-detail-location";
import { ListingDetailSidebar } from "@/components/properties/listing-detail-sidebar";
import { propertyProvider } from "@/providers";
import { formatPrice } from "@/lib/format";
import { getWalkScore } from "@/lib/walk-score";
import { getNearbySchools } from "@/lib/great-schools";
import { createMetadata } from "@/lib/metadata";
import { IdxDisclaimer } from "@/components/properties/idx-disclaimer";
import { PHONE } from "@/lib/constants";
import { JsonLdScript } from "@/components/shared/json-ld-script";
import { realEstateListingJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";

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

const statusVariant: Record<string, "success" | "crimson" | "gold" | "default"> = {
  "Active": "success",
  "For Sale": "success",
  "New Listing": "crimson",
  "Pending": "gold",
  "Sold": "default",
};

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const property = await propertyProvider.getProperty(id);

  if (!property) notFound();

  // Fetch third-party data in parallel (graceful if unavailable)
  const [walkScoreResult, schools] = await Promise.all([
    property.latitude && property.longitude
      ? getWalkScore(`${property.address}, ${property.city}, ${property.state} ${property.zip}`, property.latitude, property.longitude)
      : Promise.resolve(null),
    property.latitude && property.longitude
      ? getNearbySchools(property.latitude, property.longitude)
      : Promise.resolve(null),
  ]);

  // Merge walk scores into property for display
  const enrichedProperty = {
    ...property,
    walkScore: walkScoreResult?.walkScore ?? property.walkScore ?? undefined,
    transitScore: walkScoreResult?.transitScore ?? property.transitScore ?? undefined,
    bikeScore: walkScoreResult?.bikeScore ?? property.bikeScore ?? undefined,
  };

  const photos = property.photos?.length ? property.photos : [property.imageUrl];

  return (
    <>
      <JsonLdScript data={[
        realEstateListingJsonLd(property),
        breadcrumbJsonLd([
          { name: "Home", href: "/" },
          { name: "Properties", href: "/properties" },
          { name: property.address, href: `/properties/${id}` },
        ]),
      ]} />
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

      {/* Photo Gallery or Hero Image */}
      {photos.length > 1 ? (
        <div className="bg-white">
          <Container className="py-6">
            <PhotoGallery photos={photos} address={property.address} />
          </Container>
        </div>
      ) : (
        <div className="relative aspect-[21/9] md:aspect-[3/1] bg-slate-100 overflow-hidden">
          <Image
            src={property.imageUrl}
            alt={`${property.address}, ${property.city}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>
      )}

      {/* Price + Status bar */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <Container>
          <div className="flex items-end justify-between gap-4 flex-wrap py-5">
            <div>
              <Badge variant={statusVariant[property.status] ?? "default"} size="lg" className="mb-2">
                {property.status}
              </Badge>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700">
                {formatPrice(property.closePrice ?? property.price)}
              </h1>
              {property.status === "Sold" && property.closePrice && (
                <p className="text-sm text-slate-400 line-through">{formatPrice(property.price)}</p>
              )}
              <p className="text-slate-600 text-lg mt-1">
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

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100">
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
            {property.yearBuilt && (
              <>
                <Divider />
                <StatItem label="Year Built" value={String(property.yearBuilt)} />
              </>
            )}
          </div>
        </Container>
      </div>

      {/* Main content */}
      <section className="section-padding bg-cream-50">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 xl:gap-14 items-start">
            {/* Left: Details */}
            <div className="space-y-8">
              <ListingDetailOverview property={enrichedProperty} />
              <ListingDetailLocation property={enrichedProperty} schools={schools} />

              {/* Payment estimate */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Estimated Monthly Payment</h2>
                <PaymentEstimate price={property.price} />
              </div>
            </div>

            {/* Right: Sidebar */}
            <ListingDetailSidebar property={enrichedProperty} />
          </div>
        </Container>
      </section>

      <div className="bg-cream-50">
        <Container>
          <IdxDisclaimer />
        </Container>
      </div>

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
