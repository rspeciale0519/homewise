import type { Metadata } from "next";
import { SITE_NAME, DESCRIPTION } from "@/lib/constants";
import { HeroSection } from "@/components/home/hero-section";
import { PromoCards } from "@/components/home/promo-cards";
import { FeaturedListings } from "@/components/home/featured-listings";
import { CompanyDescription } from "@/components/home/company-description";
import { CtaBanner } from "@/components/shared/cta-banner";
import { JsonLdScript } from "@/components/shared/json-ld-script";
import { organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: DESCRIPTION,
};

export default async function HomePage() {
  const featuredListings = await prisma.listing.findMany({
    where: { featured: true, status: { in: ["Active", "Pending"] } },
    orderBy: { price: "desc" },
    take: 12,
    select: {
      id: true,
      imageUrl: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      price: true,
      beds: true,
      baths: true,
      sqft: true,
      status: true,
      daysOnMarket: true,
    },
  });

  const mappedListings = featuredListings.map((l) => ({
    ...l,
    imageUrl: l.imageUrl ?? "",
  }));

  return (
    <>
      <JsonLdScript data={[organizationJsonLd(), websiteJsonLd()]} />
      <HeroSection />
      <PromoCards />
      <FeaturedListings listings={mappedListings.length > 0 ? mappedListings : undefined} />
      <CompanyDescription />
      <CtaBanner
        eyebrow="Get Started Today"
        title="What Is Your Home Worth?"
        subtitle="Find out your home's current market value with a free, no-obligation evaluation from one of our local experts."
        primaryCta={{ label: "Request Free Evaluation", href: "/home-evaluation" }}
        secondaryCta={{ label: "Find an Agent", href: "/agents" }}
        variant="navy"
      />
    </>
  );
}
