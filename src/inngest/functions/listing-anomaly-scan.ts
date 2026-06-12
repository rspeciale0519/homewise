import { prisma } from "@/lib/prisma";
import {
  ANOMALY_KINDS,
  PRICE_DROP_THRESHOLD,
  duplicateKey,
  isStaleListing,
  priceDropFraction,
} from "@/lib/listing-anomalies";
import { inngest } from "../client";

async function upsertAnomaly(listingId: string, kind: string, detail: string): Promise<void> {
  await prisma.listingAnomaly.upsert({
    where: { listingId_kind: { listingId, kind } },
    update: { detail },
    create: { listingId, kind, detail },
  });
}

async function scanPriceDrops(now: Date): Promise<number> {
  const recentDrops = await prisma.priceHistory.findMany({
    where: { observedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    select: { listingId: true },
    distinct: ["listingId"],
    take: 2000,
  });

  let flagged = 0;
  for (const { listingId } of recentDrops) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        price: true,
        status: true,
        priceHistory: { select: { price: true, observedAt: true } },
      },
    });
    if (!listing || listing.status !== "Active") continue;

    const drop = priceDropFraction(listing.priceHistory, listing.price, now);
    if (drop > PRICE_DROP_THRESHOLD) {
      await upsertAnomaly(
        listing.id,
        ANOMALY_KINDS.priceDrop,
        `Price dropped ${(drop * 100).toFixed(1)}% within 7 days`,
      );
      flagged++;
    }
  }
  return flagged;
}

async function scanStaleListings(): Promise<number> {
  const stale = await prisma.listing.findMany({
    where: { status: "Active", daysOnMarket: { gt: 180 } },
    select: { id: true, daysOnMarket: true, status: true },
    take: 2000,
  });

  let flagged = 0;
  for (const listing of stale) {
    if (!isStaleListing(listing.daysOnMarket, listing.status)) continue;
    await upsertAnomaly(
      listing.id,
      ANOMALY_KINDS.staleDom,
      `${listing.daysOnMarket} days on market`,
    );
    flagged++;
  }
  return flagged;
}

async function scanDuplicatesAndMissingPhotos(): Promise<{ duplicates: number; noPhotos: number }> {
  const actives = await prisma.listing.findMany({
    where: { status: "Active" },
    select: { id: true, address: true, city: true, photos: true },
  });

  const byKey = new Map<string, string[]>();
  for (const listing of actives) {
    const key = duplicateKey(listing.address, listing.city);
    byKey.set(key, [...(byKey.get(key) ?? []), listing.id]);
  }

  let duplicates = 0;
  for (const [key, ids] of byKey) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      await upsertAnomaly(id, ANOMALY_KINDS.duplicateAddress, `${ids.length} active listings at ${key.split("|")[0]}`);
      duplicates++;
    }
  }

  let noPhotos = 0;
  for (const listing of actives) {
    if (listing.photos.length > 0) continue;
    await upsertAnomaly(listing.id, ANOMALY_KINDS.noPhotos, "Active listing has no photos");
    noPhotos++;
  }

  return { duplicates, noPhotos };
}

export const listingAnomalyScan = inngest.createFunction(
  { id: "listing-anomaly-scan" },
  { cron: "30 10 * * *" }, // daily, 5:30am ET
  async ({ step }) => {
    const now = new Date();
    const priceDrops = await step.run("scan-price-drops", () => scanPriceDrops(now));
    const stale = await step.run("scan-stale-listings", () => scanStaleListings());
    const rest = await step.run("scan-duplicates-and-photos", () => scanDuplicatesAndMissingPhotos());

    return { priceDrops, stale, ...rest };
  },
);
