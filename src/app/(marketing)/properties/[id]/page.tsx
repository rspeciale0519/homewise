import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CtaBanner } from "@/components/shared/cta-banner";
import { PhotoGallery } from "@/components/properties/photo-gallery";
import { TrackView } from "@/components/properties/track-view";
import { ListingDetailOverview } from "@/components/properties/listing-detail-overview";
import { ListingDetailLocation } from "@/components/properties/listing-detail-location";
import { ListingDetailSidebar } from "@/components/properties/listing-detail-sidebar";
import { propertyProvider } from "@/providers";
import { prisma } from "@/lib/prisma";
import { recordListingView } from "@/lib/listing-views";
import { formatPrice } from "@/lib/format";
import { calculateTco } from "@/lib/tco";
import { PriceHistoryTimeline } from "@/components/properties/price-history-timeline";
import { getWalkScore } from "@/lib/walk-score";
import { getNearbySchools } from "@/lib/great-schools";
import { createMetadata } from "@/lib/metadata";
import { IdxDisclaimer } from "@/components/properties/idx-disclaimer";
import { ListingAttribution } from "@/components/properties/listing-attribution";
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

  recordListingView(id).catch(() => undefined);

  // Fetch third-party data in parallel (graceful if unavailable)
  const hasCoordinates = property.latitude != null && property.longitude != null;

  const [walkScoreResult, schools, priceHistory] = await Promise.all([
    hasCoordinates && property.latitude != null && property.longitude != null
      ? getWalkScore(`${property.address}, ${property.city}, ${property.state} ${property.zip}`, property.latitude, property.longitude)
      : Promise.resolve(null),
    hasCoordinates && property.latitude != null && property.longitude != null
      ? getNearbySchools(property.latitude, property.longitude)
      : Promise.resolve(null),
    prisma.priceHistory.findMany({
      where: { listingId: id },
      orderBy: { observedAt: "asc" },
      select: { observedAt: true, price: true },
    }),
  ]);

  console.log("[PropertyDetailPage] Walk score result:", walkScoreResult);

  // Merge walk scores into property for display
  const enrichedProperty = {
    ...property,
    walkScore: walkScoreResult?.walkScore ?? property.walkScore ?? undefined,
    walkScoreDescription: walkScoreResult?.walkScoreDescription ?? undefined,
    transitScore: walkScoreResult?.transitScore ?? property.transitScore ?? undefined,
    transitScoreDescription: walkScoreResult?.transitScoreDescription ?? undefined,
    bikeScore: walkScoreResult?.bikeScore ?? property.bikeScore ?? undefined,
    bikeScoreDescription: walkScoreResult?.bikeScoreDescription ?? undefined,
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

      <TrackView propertyId={property.id} />

      {/* Photo Gallery */}
      <div className="bg-white">
        <Container className="py-6">
          <PhotoGallery photos={photos} address={property.address} />
        </Container>
      </div>

      {/* Price + Status bar */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <Container>
          <div className="flex items-end justify-between gap-4 flex-wrap py-5">
            <div>
              <span className="inline-flex items-center gap-2 mb-2">
                <Badge variant={statusVariant[property.status] ?? "default"} size="lg">
                  {property.status}
                </Badge>
                {property.mlsSource === "manual" && (
                  <Badge variant="crimson" size="lg">Exclusive</Badge>
                )}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700">
                {formatPrice(property.closePrice ?? property.price)}
              </h1>
              {property.status === "Sold" && property.closePrice && (
                <p className="text-sm text-slate-400 line-through">{formatPrice(property.price)}</p>
              )}
              <p className="text-slate-600 text-lg mt-1">
                {property.address}, {property.city}, {property.state} {property.zip}
              </p>
              <ListingAttribution
                listingOfficeName={property.listingOfficeName}
                listingAgentName={property.listingAgentName}
                listingId={property.listingId}
                mlsId={property.mlsId}
                status={property.status}
                className="mt-2"
              />
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
              {property.tags && property.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {property.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/properties?tag=${encodeURIComponent(tag)}`}
                      className="px-3 py-1 rounded-full bg-navy-50 text-navy-700 text-xs font-semibold capitalize hover:bg-navy-100 transition-colors"
                    >
                      {tag.replaceAll("-", " ")}
                    </Link>
                  ))}
                </div>
              )}
              <PriceHistoryTimeline
                points={priceHistory.map((point) => ({
                  observedAt: point.observedAt.toISOString(),
                  price: point.price,
                }))}
              />
              <ListingDetailLocation property={enrichedProperty} schools={schools} />

              {/* Cost of ownership estimate */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-navy-700 mb-4">Estimated Monthly Cost of Ownership</h2>
                <PaymentEstimate
                  price={property.price}
                  taxAmount={property.taxAmount}
                  hoaFee={property.hoaFee}
                  hoaFrequency={property.hoaFrequency}
                />
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
        primaryCta={{ label: "Back to Search", fallbackHref: "/properties" }}
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

function PaymentEstimate({
  price,
  taxAmount,
  hoaFee,
  hoaFrequency,
}: {
  price: number;
  taxAmount?: number | null;
  hoaFee?: number | null;
  hoaFrequency?: string | null;
}) {
  const tco = calculateTco({ price, taxAmount, hoaFee, hoaFrequency });

  return (
    <div className="space-y-3">
      <CostRow label="Principal & Interest" amount={tco.principalAndInterest} />
      <CostRow
        label={tco.taxIsEstimate ? "Property Taxes (est.)" : "Property Taxes"}
        amount={tco.propertyTax}
      />
      <CostRow label="Insurance (est.)" amount={tco.insurance} />
      {tco.hoa > 0 && <CostRow label="HOA" amount={tco.hoa} />}
      <div className="flex justify-between items-center py-3 bg-navy-50 rounded-xl px-4 -mx-1">
        <span className="text-sm font-semibold text-navy-700">Estimated Total</span>
        <span className="font-serif text-xl font-bold text-crimson-600">${Math.round(tco.total).toLocaleString()}/mo</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Based on 20% down ({formatPrice(tco.downPayment)}), 6.5% interest rate, 30-year fixed mortgage.
        {tco.taxIsEstimate
          ? " Taxes estimated at 1% of list price annually."
          : " Taxes from the most recent assessment on record."}{" "}
        Insurance estimated at 0.5% of list price annually. All figures are estimates — actual costs will vary.
      </p>
    </div>
  );
}

function CostRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-navy-700">${Math.round(amount).toLocaleString()}/mo</span>
    </div>
  );
}
