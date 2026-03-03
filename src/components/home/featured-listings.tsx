"use client";

import { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { MOCK_LISTINGS } from "@/data/mock/listings";
import { formatPrice } from "@/lib/format";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { cn } from "@/lib/utils";

interface FeaturedListing {
  id: string;
  imageUrl: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: string;
  daysOnMarket: number;
}

const STATUS_STYLES: Record<string, string> = {
  "New Listing": "bg-crimson-600 text-white",
  "For Sale": "bg-navy-600 text-white",
  Active: "bg-navy-600 text-white",
  Pending: "bg-amber-500 text-white",
};

function ListingCard({ listing }: { listing: FeaturedListing }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-slate-100 group h-full flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden shrink-0">
        <Image
          src={listing.imageUrl}
          alt={`${listing.address}, ${listing.city} FL`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={cn("text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full", STATUS_STYLES[listing.status] ?? "bg-navy-600 text-white")}>
            {listing.status}
          </span>
        </div>
        {/* Days on market */}
        {listing.daysOnMarket <= 7 && (
          <div className="absolute top-3 right-3">
            <span className="text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-0.5 rounded-full">
              {listing.daysOnMarket}d ago
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col flex-1">
        {/* Price */}
        <p className="font-serif text-2xl font-semibold text-navy-700 mb-1">
          {formatPrice(listing.price)}
        </p>

        {/* Address */}
        <p className="text-sm font-medium text-slate-700 mb-0.5">{listing.address}</p>
        <p className="text-xs text-slate-400 mb-4">
          {listing.city}, {listing.state} {listing.zip}
        </p>

        {/* Specs row */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-auto">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <svg className="h-3.5 w-3.5 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-semibold text-slate-700">{listing.beds}</span> bd
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <svg className="h-3.5 w-3.5 text-crimson-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-slate-700">{listing.baths}</span> ba
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto">
            <span className="font-semibold text-slate-700">{listing.sqft.toLocaleString()}</span> sqft
          </span>
        </div>
      </div>
    </div>
  );
}

interface FeaturedListingsProps {
  listings?: FeaturedListing[];
}

export function FeaturedListings({ listings }: FeaturedListingsProps) {
  const items: FeaturedListing[] = listings ?? MOCK_LISTINGS;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    dragFree: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  // Auto-advance
  useEffect(() => {
    if (!emblaApi) return;
    const id = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [emblaApi]);

  return (
    <section className="section-padding bg-white">
      <Container>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <SectionHeading
            eyebrow="Available Now"
            title="Featured Properties"
            subtitle="Hand-selected listings across Central Florida's most sought-after communities."
            align="left"
            className="max-w-lg"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={scrollPrev}
              className="h-10 w-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-navy-600 hover:text-white hover:border-navy-600 transition-all duration-200"
              aria-label="Previous listing"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={scrollNext}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-navy-600 text-white hover:bg-navy-700 transition-colors duration-200"
              aria-label="Next listing"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div ref={emblaRef} className="overflow-hidden -mx-2">
          <div className="flex">
            {items.map((listing) => (
              <div
                key={listing.id}
                className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-2 min-w-0"
              >
                <Link href={`/properties/${listing.id}`} className="block h-full">
                  <ListingCard listing={listing} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === selectedIndex
                  ? "w-6 h-2 bg-crimson-600"
                  : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* View all link */}
        <div className="text-center mt-8">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors group"
          >
            View all properties
            <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </Container>
    </section>
  );
}
