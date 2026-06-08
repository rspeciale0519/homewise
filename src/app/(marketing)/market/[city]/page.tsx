import type { Metadata } from "next";
import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/prisma";
import { analyticsBoEnabled } from "@/lib/analytics-flags";
import { MarketStatsView } from "./market-stats-view";

interface MarketPageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { city } = await params;
  const displayCity = decodeURIComponent(city).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${displayCity} Real Estate Market Statistics — Homewise FL`,
    description: `Live market statistics for ${displayCity}, FL including median price, days on market, and inventory.`,
  };
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { city } = await params;
  const displayCity = decodeURIComponent(city).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const boAnalyticsEnabled = analyticsBoEnabled();

  const stats = boAnalyticsEnabled
    ? await prisma.marketStats.findMany({
        where: { area: { equals: displayCity, mode: "insensitive" }, areaType: "city" },
        orderBy: { period: "desc" },
        take: 6,
      })
    : [];

  const seoContent = await prisma.seoContent.findFirst({
    where: { city: { equals: displayCity, mode: "insensitive" }, status: "published" },
  });

  const serializedStats = stats.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mb-2">{displayCity} Market Statistics</h1>
      <p className="text-slate-500 mb-8">Real estate market data for {displayCity}, FL</p>
      {boAnalyticsEnabled ? (
        <MarketStatsView city={displayCity} stats={serializedStats} seoContent={seoContent?.body ?? null} />
      ) : (
        <MarketAnalyticsUnavailable city={displayCity} seoContent={seoContent?.body ?? null} />
      )}
    </div>
  );
}

function MarketAnalyticsUnavailable({
  city,
  seoContent,
}: {
  city: string;
  seoContent: string | null;
}) {
  const sanitizedSeoContent = seoContent ? DOMPurify.sanitize(seoContent) : null;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-navy-700">
          Market analytics unavailable
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Sold-data analytics for {city} are paused until the Back Office MLS
          feed is licensed and enabled. Connect with a Home Wise agent for a
          private, agent-prepared market review.
        </p>
      </div>
      {sanitizedSeoContent && (
        <div
          className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
          dangerouslySetInnerHTML={{ __html: sanitizedSeoContent }}
        />
      )}
    </div>
  );
}
