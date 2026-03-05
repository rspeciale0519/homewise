import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
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

  const stats = await prisma.marketStats.findMany({
    where: { area: { equals: displayCity, mode: "insensitive" }, areaType: "city" },
    orderBy: { period: "desc" },
    take: 6,
  });

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
      <p className="text-slate-500 mb-8">Live real estate market data for {displayCity}, FL</p>
      <MarketStatsView city={displayCity} stats={serializedStats} seoContent={seoContent?.body ?? null} />
    </div>
  );
}
