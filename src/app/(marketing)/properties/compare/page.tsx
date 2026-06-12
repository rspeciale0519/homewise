import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { Container } from "@/components/ui/container";
import { IdxDisclaimer } from "@/components/properties/idx-disclaimer";
import { ListingAttribution } from "@/components/properties/listing-attribution";
import { BackButton } from "@/components/ui/back-button";
import { prisma } from "@/lib/prisma";
import { withIdx } from "@/lib/mls-visibility";
import { formatPrice } from "@/lib/format";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Compare Properties",
  description: "Side-by-side comparison of Central Florida homes for sale.",
  path: "/properties/compare",
});

const paramsSchema = z.object({
  ids: z
    .string()
    .transform((value) => [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))])
    .pipe(z.array(z.string().min(1)).min(2).max(4)),
});

interface ComparePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ComparePropertiesPage({ searchParams }: ComparePageProps) {
  const raw = await searchParams;
  const parsed = paramsSchema.safeParse({ ids: typeof raw.ids === "string" ? raw.ids : "" });

  if (!parsed.success) {
    return (
      <Container className="py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-navy-700 mb-3">Compare Properties</h1>
        <p className="text-slate-500 mb-6">Select 2 to 4 properties from the search results to compare them side by side.</p>
        <Link href="/properties" className="inline-block px-6 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 transition-colors">
          Browse Properties
        </Link>
      </Container>
    );
  }

  const listings = await prisma.listing.findMany({
    where: withIdx({ id: { in: parsed.data.ids } }),
    select: {
      id: true,
      price: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      beds: true,
      baths: true,
      sqft: true,
      lotSize: true,
      yearBuilt: true,
      propertyType: true,
      status: true,
      imageUrl: true,
      daysOnMarket: true,
      hoaFee: true,
      hoaFrequency: true,
      taxAmount: true,
      walkScore: true,
      transitScore: true,
      bikeScore: true,
      listingId: true,
      mlsId: true,
      listingOfficeName: true,
      listingAgentName: true,
    },
  });
  const ordered = parsed.data.ids
    .map((id) => listings.find((listing) => listing.id === id))
    .filter((listing): listing is NonNullable<typeof listing> => listing != null);

  if (ordered.length < 2) {
    return (
      <Container className="py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-navy-700 mb-3">Compare Properties</h1>
        <p className="text-slate-500 mb-6">We couldn&apos;t find enough of the selected properties. They may no longer be available.</p>
        <Link href="/properties" className="inline-block px-6 py-2.5 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 transition-colors">
          Browse Properties
        </Link>
      </Container>
    );
  }

  const rows: Array<{ label: string; value: (l: (typeof ordered)[number]) => string }> = [
    { label: "Price", value: (l) => formatPrice(l.price) },
    { label: "$ / Sq Ft", value: (l) => (l.sqft > 0 ? `$${Math.round(l.price / l.sqft).toLocaleString()}` : "—") },
    { label: "Status", value: (l) => l.status },
    { label: "Beds", value: (l) => String(l.beds) },
    { label: "Baths", value: (l) => String(l.baths) },
    { label: "Sq Ft", value: (l) => (l.sqft > 0 ? l.sqft.toLocaleString() : "—") },
    { label: "Lot Size", value: (l) => (l.lotSize ? `${l.lotSize.toLocaleString()}` : "—") },
    { label: "Year Built", value: (l) => (l.yearBuilt ? String(l.yearBuilt) : "—") },
    { label: "Type", value: (l) => l.propertyType },
    { label: "HOA", value: (l) => (l.hoaFee ? `$${l.hoaFee.toLocaleString()}${l.hoaFrequency ? `/${l.hoaFrequency.toLowerCase()}` : ""}` : "None") },
    { label: "Annual Tax", value: (l) => (l.taxAmount ? `$${Math.round(l.taxAmount).toLocaleString()}` : "—") },
    { label: "Days on Market", value: (l) => String(l.daysOnMarket) },
    { label: "Walk Score", value: (l) => (l.walkScore != null ? String(l.walkScore) : "—") },
    { label: "Transit Score", value: (l) => (l.transitScore != null ? String(l.transitScore) : "—") },
    { label: "Bike Score", value: (l) => (l.bikeScore != null ? String(l.bikeScore) : "—") },
  ];

  return (
    <>
      <div className="bg-cream-50 border-b border-cream-200">
        <Container className="py-6">
          <BackButton fallbackHref="/properties" label="Back to Search" className="mb-3" />
          <h1 className="font-serif text-3xl font-semibold text-navy-700">Compare Properties</h1>
        </Container>
      </div>

      <section className="bg-white py-8">
        <Container>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left align-bottom p-3 w-40" />
                  {ordered.map((listing) => (
                    <th key={listing.id} className="p-3 text-left align-top">
                      <Link href={`/properties/${listing.id}`} className="block group">
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-2">
                          <Image
                            src={listing.imageUrl ?? "/images/logo.png"}
                            alt={listing.address}
                            fill
                            sizes="(max-width: 1024px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <span className="block font-medium text-navy-700 group-hover:text-crimson-600 transition-colors truncate">
                          {listing.address}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {listing.city}, {listing.state} {listing.zip}
                        </span>
                      </Link>
                      <ListingAttribution
                        listingOfficeName={listing.listingOfficeName}
                        listingAgentName={listing.listingAgentName}
                        listingId={listing.listingId}
                        mlsId={listing.mlsId}
                        status={listing.status}
                        className="mt-2"
                        compact
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{row.label}</td>
                    {ordered.map((listing) => (
                      <td key={listing.id} className="p-3 font-medium text-navy-700">
                        {row.value(listing)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <div className="bg-white">
        <Container>
          <IdxDisclaimer />
        </Container>
      </div>
    </>
  );
}
