import { Prisma, type SyncState } from "@prisma/client";
import { buildOpenHouseUrl, fetchOpenHousePage } from "@/lib/mls-grid";
import { prisma } from "@/lib/prisma";
import type { ResoOpenHouse } from "@/types/reso";

const OPENHOUSE_PROVIDER = "stellar-openhouse";
const PAGE_SIZE = 200;

type StepLike = {
  run(id: string, handler: () => Promise<unknown>): Promise<unknown>;
  sleep(id: string, duration: string): Promise<void>;
};

type SyncedOpenHouseSlot = {
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  remarks?: string;
  openHouseKey?: string;
};

type OpenHousePageResult = {
  processed: number;
  updated: number;
  cleared: number;
  maxCursor?: string;
};

export type OpenHouseSyncResult = {
  processed: number;
  updated: number;
  cleared: number;
  expiredCleared: number;
  cursor?: string;
};

export async function syncOpenHouses(step: StepLike): Promise<OpenHouseSyncResult> {
  const state = (await step.run("begin-openhouse-sync", async () => {
    return prisma.syncState.upsert({
      where: { provider: OPENHOUSE_PROVIDER },
      update: { status: "syncing", updatedAt: new Date() },
      create: { provider: OPENHOUSE_PROVIDER, status: "syncing" },
    });
  })) as SyncState;

  let nextLink: string | undefined;
  let cursor = state.cursor ?? undefined;
  let processed = 0;
  let updated = 0;
  let cleared = 0;
  let pageIndex = 0;

  try {
    do {
      const pageUrl = nextLink ?? buildOpenHouseUrl({ modifiedAfter: cursor, top: PAGE_SIZE });
      const page = (await step.run(`fetch-openhouse-page-${pageIndex}`, async () => {
        return fetchOpenHousePage(pageUrl);
      })) as Awaited<ReturnType<typeof fetchOpenHousePage>>;
      const result = (await step.run(`process-openhouse-page-${pageIndex}`, async () => {
        return processOpenHousePage(page.value);
      })) as OpenHousePageResult;

      processed += result.processed;
      updated += result.updated;
      cleared += result.cleared;
      cursor = maxIsoTimestamp(cursor, result.maxCursor);
      nextLink = page["@odata.nextLink"];

      await step.run(`persist-openhouse-cursor-${pageIndex}`, async () => {
        return prisma.syncState.update({
          where: { provider: OPENHOUSE_PROVIDER },
          data: {
            cursor,
            lastSyncAt: new Date(),
            totalSynced: { increment: result.updated },
            lastError: null,
          },
        });
      });

      if (nextLink) {
        await step.sleep(`openhouse-throttle-${pageIndex}`, "600ms");
      }
      pageIndex++;
    } while (nextLink);

    const expiredCleared = (await step.run("clear-expired-openhouses", async () => {
      return clearExpiredOpenHouseSchedules(new Date());
    })) as number;

    await step.run("finish-openhouse-sync", async () => {
      return prisma.syncState.update({
        where: { provider: OPENHOUSE_PROVIDER },
        data: { status: "idle", lastSyncAt: new Date(), cursor, lastError: null },
      });
    });

    return { processed, updated, cleared, expiredCleared, cursor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.syncState.update({
      where: { provider: OPENHOUSE_PROVIDER },
      data: { status: "error", lastError: message },
    });
    throw error;
  }
}

async function processOpenHousePage(
  openHouses: ResoOpenHouse[],
): Promise<OpenHousePageResult> {
  const slotsByListingId = new Map<string, SyncedOpenHouseSlot[]>();
  const clearListingIds = new Set<string>();
  let maxCursor: string | undefined;

  for (const openHouse of openHouses) {
    maxCursor = maxIsoTimestamp(maxCursor, openHouse.ModificationTimestamp);
    const listingId = openHouse.ListingId;
    if (!listingId) continue;

    if (openHouse.MlgCanView === false) {
      clearListingIds.add(listingId);
      continue;
    }

    const slot = toOpenHouseSlot(openHouse);
    if (!slot) continue;

    const slots = slotsByListingId.get(listingId) ?? [];
    slots.push(slot);
    slotsByListingId.set(listingId, slots);
  }

  let updated = 0;
  for (const [listingId, slots] of slotsByListingId) {
    const result = await prisma.listing.updateMany({
      where: { listingId },
      data: { openHouseSchedule: slots },
    });
    updated += result.count;
  }

  let cleared = 0;
  const clearIds = [...clearListingIds];
  if (clearIds.length > 0) {
    const result = await prisma.listing.updateMany({
      where: { listingId: { in: clearIds } },
      data: { openHouseSchedule: Prisma.JsonNull },
    });
    cleared = result.count;
  }

  return { processed: openHouses.length, updated, cleared, maxCursor };
}

function toOpenHouseSlot(openHouse: ResoOpenHouse): SyncedOpenHouseSlot | null {
  const start = parseOpenHouseDateTime(
    openHouse.OpenHouseDate,
    openHouse.OpenHouseStartTime,
  );
  const end = parseOpenHouseDateTime(
    openHouse.OpenHouseDate,
    openHouse.OpenHouseEndTime,
  );

  if (!start || !end) return null;

  return {
    date: openHouse.OpenHouseDate,
    startTime: openHouse.OpenHouseStartTime,
    endTime: openHouse.OpenHouseEndTime,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    remarks: openHouse.OpenHouseRemarks,
    openHouseKey: openHouse.OpenHouseKey,
  };
}

function parseOpenHouseDateTime(date: string, time: string): Date | null {
  const value = time.includes("T") ? time : `${date}T${time}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function clearExpiredOpenHouseSchedules(now: Date): Promise<number> {
  const listings = await prisma.listing.findMany({
    where: { openHouseSchedule: { not: Prisma.JsonNull } },
    select: { id: true, openHouseSchedule: true },
    take: 1000,
  });
  const expiredIds = listings
    .filter((listing) => scheduleIsExpired(listing.openHouseSchedule, now))
    .map((listing) => listing.id);

  if (expiredIds.length === 0) return 0;

  const result = await prisma.listing.updateMany({
    where: { id: { in: expiredIds } },
    data: { openHouseSchedule: Prisma.JsonNull },
  });
  return result.count;
}

function scheduleIsExpired(schedule: Prisma.JsonValue, now: Date): boolean {
  if (!Array.isArray(schedule) || schedule.length === 0) return true;

  return schedule.every((slot) => {
    if (!isRecord(slot)) return true;
    const endDateTime = stringValue(slot.endDateTime);
    if (!endDateTime) return true;
    return new Date(endDateTime).getTime() < now.getTime();
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function maxIsoTimestamp(left?: string, right?: string): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}
