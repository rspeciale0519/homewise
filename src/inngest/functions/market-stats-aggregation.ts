import { inngest } from "../client";
import { prisma } from "@/lib/prisma";

const TRACKED_CITIES = [
  "Orlando", "Winter Park", "Oviedo", "Sanford", "Kissimmee",
  "Winter Garden", "Clermont", "Lake Mary", "Longwood", "Altamonte Springs",
  "Apopka", "Maitland", "Windermere", "Dr Phillips", "Celebration",
];

export const dailyMarketStatsAggregation = inngest.createFunction(
  { id: "daily-market-stats", concurrency: { limit: 1 } },
  { cron: "0 4 * * *" }, // Daily at 4 AM
  async ({ step }) => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let upserted = 0;

    for (const city of TRACKED_CITIES) {
      await step.run(`stats-${city}`, async () => {
        const [activeStats, soldStats, newListings] = await Promise.all([
          prisma.listing.aggregate({
            where: { city: { equals: city, mode: "insensitive" }, status: "Active" },
            _count: true,
            _avg: { price: true, daysOnMarket: true, sqft: true },
          }),
          prisma.listing.aggregate({
            where: {
              city: { equals: city, mode: "insensitive" },
              status: "Sold",
              closeDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
            },
            _count: true,
            _avg: { price: true, closePrice: true },
          }),
          prisma.listing.count({
            where: {
              city: { equals: city, mode: "insensitive" },
              status: "Active",
              createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
            },
          }),
        ]);

        const activeCount = activeStats._count;
        const soldCount = soldStats._count;
        const avgPrice = activeStats._avg.price ?? 0;
        const avgDom = Math.round(activeStats._avg.daysOnMarket ?? 0);
        const avgSqft = activeStats._avg.sqft ?? 1;
        const avgSoldPrice = soldStats._avg.closePrice ?? soldStats._avg.price ?? 0;
        const saleToListRatio = avgPrice > 0 && avgSoldPrice > 0 ? avgSoldPrice / avgPrice : 0;
        const monthsOfInventory = soldCount > 0 ? activeCount / soldCount : 0;
        const pricePerSqft = avgSqft > 0 ? avgPrice / avgSqft : 0;

        // Compute median price
        const prices = await prisma.listing.findMany({
          where: { city: { equals: city, mode: "insensitive" }, status: "Active" },
          select: { price: true },
          orderBy: { price: "asc" },
        });
        const medianPrice = prices.length > 0
          ? prices[Math.floor(prices.length / 2)]!.price
          : 0;

        await prisma.marketStats.upsert({
          where: { area_areaType_period: { area: city, areaType: "city", period } },
          create: {
            area: city,
            areaType: "city",
            period,
            activeCount,
            soldCount,
            medianPrice,
            avgPrice: Math.round(avgPrice),
            saleToListRatio: Math.round(saleToListRatio * 1000) / 1000,
            avgDom,
            monthsOfInventory: Math.round(monthsOfInventory * 10) / 10,
            newListings,
            pricePerSqft: Math.round(pricePerSqft),
          },
          update: {
            activeCount,
            soldCount,
            medianPrice,
            avgPrice: Math.round(avgPrice),
            saleToListRatio: Math.round(saleToListRatio * 1000) / 1000,
            avgDom,
            monthsOfInventory: Math.round(monthsOfInventory * 10) / 10,
            newListings,
            pricePerSqft: Math.round(pricePerSqft),
          },
        });

        upserted++;
      });
    }

    return { cities: TRACKED_CITIES.length, upserted };
  },
);
