import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Pagination } from "@/components/ui/pagination";
import { CtaBanner } from "@/components/shared/cta-banner";
import { SearchFilters } from "@/components/properties/search-filters";
import { ListingGrid } from "@/components/properties/listing-grid";
import { PropertySearchShell } from "@/components/properties/property-search-shell";
import { OpenHouseWidget } from "@/components/properties/open-house-widget";
import { propertyProvider } from "@/providers";
import type { PropertyFilters } from "@/providers/property-provider";
import { propertyFilterSchema } from "@/schemas/property-filter.schema";
import { IdxDisclaimer } from "@/components/properties/idx-disclaimer";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Property Search",
  description:
    "Search homes for sale in Central Florida. Filter by city, price, bedrooms, and more. Listings updated daily by Home Wise Realty Group.",
  path: "/properties",
});

interface PropertiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const rawParams = await searchParams;

  const flat: Record<string, string> = {};
  for (const [key, val] of Object.entries(rawParams)) {
    if (typeof val === "string") flat[key] = val;
    else if (Array.isArray(val) && val[0]) flat[key] = val[0];
  }

  const parsed = propertyFilterSchema.safeParse(flat);

  const rawFilters = parsed.success ? parsed.data : { page: 1, perPage: 12 };
  const { north, south, east, west, polygon: polygonStr, ...rest } = rawFilters;
  const filters: PropertyFilters = { ...rest };

  if (north !== undefined && south !== undefined && east !== undefined && west !== undefined) {
    filters.bounds = { north, south, east, west };
  }
  if (typeof polygonStr === "string" && polygonStr) {
    try {
      const coords = JSON.parse(polygonStr) as [number, number][];
      if (Array.isArray(coords) && coords.length >= 3) filters.polygon = coords;
    } catch { /* ignore */ }
  }

  const result = await propertyProvider.search(filters);

  return (
    <>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="prop-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#prop-grid)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li>
                <Link
                  href="/"
                  className="hover:text-slate-200 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="h-3 w-3 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-slate-300">Property Search</span>
              </li>
            </ol>
          </nav>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            Browse Listings
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            Find Your Perfect Home
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed mb-2">
            Explore Central Florida homes for sale — from lakefront estates to
            cozy condos. Filter by location, price, and features to discover
            your next chapter.
          </p>
        </Container>
      </div>

      {/* Filters + Results */}
      <section className="section-padding bg-cream-50">
        <Container>
          <SearchFilters
            currentLocation={parsed.success ? parsed.data.location : undefined}
            currentMinPrice={parsed.success ? parsed.data.minPrice : undefined}
            currentMaxPrice={parsed.success ? parsed.data.maxPrice : undefined}
            currentBeds={parsed.success ? parsed.data.beds : undefined}
            currentBaths={parsed.success ? parsed.data.baths : undefined}
            currentPropertyType={parsed.success ? parsed.data.propertyType : undefined}
            currentStatus={parsed.success ? parsed.data.status : undefined}
            currentSortBy={parsed.success ? parsed.data.sortBy : undefined}
            currentMinYearBuilt={parsed.success ? parsed.data.minYearBuilt : undefined}
            currentMaxYearBuilt={parsed.success ? parsed.data.maxYearBuilt : undefined}
            currentMinLotSize={parsed.success ? parsed.data.minLotSize : undefined}
            currentMaxLotSize={parsed.success ? parsed.data.maxLotSize : undefined}
            currentMaxHoa={parsed.success ? parsed.data.maxHoa : undefined}
            currentMaxDom={parsed.success ? parsed.data.maxDom : undefined}
            currentHasPool={parsed.success ? parsed.data.hasPool : undefined}
            currentHasWaterfront={parsed.success ? parsed.data.hasWaterfront : undefined}
            currentHasGarage={parsed.success ? parsed.data.hasGarage : undefined}
            currentIsNewConstruction={parsed.success ? parsed.data.isNewConstruction : undefined}
            currentHasGatedCommunity={parsed.success ? parsed.data.hasGatedCommunity : undefined}
            currentOpenHousesOnly={parsed.success ? parsed.data.openHousesOnly : undefined}
            currentSchoolDistrict={parsed.success ? parsed.data.schoolDistrict : undefined}
            totalResults={result.total}
          />

          <div className="mt-8">
            <PropertySearchShell properties={result.properties}>
              <ListingGrid properties={result.properties} />
              <Pagination
                currentPage={result.currentPage}
                totalPages={result.totalPages}
                className="mt-10"
              />
            </PropertySearchShell>
          </div>

          <div className="mt-8">
            <OpenHouseWidget properties={result.properties} />
          </div>

          <IdxDisclaimer />
        </Container>
      </section>

      <CtaBanner
        eyebrow="Can&apos;t Find What You&apos;re Looking For?"
        title="Let Us Help You Search"
        subtitle="Our agents have access to the full MLS and can find off-market opportunities. Tell us what you need and we&apos;ll do the searching."
        primaryCta={{ label: "Contact an Agent", href: "/agents" }}
        secondaryCta={{ label: "Home Evaluation", href: "/home-evaluation" }}
      />
    </>
  );
}
