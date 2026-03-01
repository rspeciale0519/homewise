import type { Metadata } from "next";
import { SITE_NAME, DESCRIPTION } from "@/lib/constants";
import { HeroSection } from "@/components/home/hero-section";
import { PromoCards } from "@/components/home/promo-cards";
import { FeaturedListings } from "@/components/home/featured-listings";
import { CompanyDescription } from "@/components/home/company-description";
import { CtaBanner } from "@/components/shared/cta-banner";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: DESCRIPTION,
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PromoCards />
      <FeaturedListings />
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
