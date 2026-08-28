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

type ListingOpenHouseChanges = {
  clearAll: boolean;
  removedKeys: Set<string>;
  upserts: SyncedOpenHouseSlot[];
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
      const result = (await step.run(`sync-openhouse-page-${pageIndex}`, async () => {
        const page = await fetchOpenHousePage(pageUrl);
        const pageResult = await processOpenHousePage(page.value);
        return { ...pageResult, nextLink: page["@odata.nextLink"] ?? null };
      })) as OpenHousePageResult & { nextLink: string | null };

      processed += result.processed;
      updated += result.updated;
      cleared += result.cleared;
      cursor = maxIsoTimestamp(cursor, result.maxCursor);
      nextLink = result.nextLink ?? undefined;

      await step.run(`persist-openhouse-progress-${pageIndex}`, async () => {
        return prisma.syncState.update({
          where: { provider: OPENHOUSE_PROVIDER },
          data: {
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
  const changesByListingId = new Map<string, ListingOpenHouseChanges>();
  let maxCursor: string | undefined;

  for (const openHouse of openHouses) {
    maxCursor = maxIsoTimestamp(maxCursor, openHouse.ModificationTimestamp);
    const listingId = openHouse.ListingId;
    if (!listingId) continue;

    const changes = changesByListingId.get(listingId) ?? {
      clearAll: false,
      removedKeys: new Set<string>(),
      upserts: [],
    };
    changesByListingId.set(listingId, changes);

    if (openHouse.MlgCanView === false) {
      if (openHouse.OpenHouseKey) {
        changes.removedKeys.add(openHouse.OpenHouseKey);
      } else {
        changes.clearAll = true;
      }
      continue;
    }

    const slot = toOpenHouseSlot(openHouse);
    if (!slot) continue;

    changes.upserts.push(slot);
    if (slot.openHouseKey) changes.removedKeys.delete(slot.openHouseKey);
  }

  const listingIds = [...changesByListingId.keys()];
  if (listingIds.length === 0) {
    return { processed: openHouses.length, updated: 0, cleared: 0, maxCursor };
  }

  const listings = await prisma.listing.findMany({
    where: { listingId: { in: listingIds } },
    select: { id: true, listingId: true, openHouseSchedule: true },
  });

  let updated = 0;
  let cleared = 0;
  for (const listing of listings) {
    if (!listing.listingId) continue;
    const changes = changesByListingId.get(listing.listingId);
    if (!changes) continue;

    const existingSlots = parseStoredSchedule(listing.openHouseSchedule);
    const mergedSlots = mergeOpenHouseSchedule(existingSlots, changes);
    if (JSON.stringify(existingSlots) === JSON.stringify(mergedSlots)) continue;

    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        openHouseSchedule:
          mergedSlots.length > 0 ? mergedSlots : Prisma.JsonNull,
      },
    });
    if (mergedSlots.length > 0) updated++;
    else cleared++;
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

export function parseOpenHouseDateTime(date: string, time: string): Date | null {
  const value = time.includes("T") ? time : `${date}T${time}`;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;

  const [yearNumber, monthNumber, dayNumber, hourNumber, minuteNumber, secondNumber] =
    parts as [number, number, number, number, number, number];
  const utcGuess = Date.UTC(
    yearNumber,
    monthNumber - 1,
    dayNumber,
    hourNumber,
    minuteNumber,
    secondNumber,
  );
  let instant = new Date(utcGuess);
  for (let iteration = 0; iteration < 2; iteration++) {
    const offset = timeZoneOffsetMilliseconds(instant, "America/New_York");
    instant = new Date(utcGuess - offset);
  }

  return Number.isNaN(instant.getTime()) ? null : instant;
}

function timeZoneOffsetMilliseconds(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return (
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    ) - instant.getTime()
  );
}

export function mergeOpenHouseSchedule(
  existingSlots: SyncedOpenHouseSlot[],
  changes: ListingOpenHouseChanges,
): SyncedOpenHouseSlot[] {
  const merged = new Map<string, SyncedOpenHouseSlot>();
  if (!changes.clearAll) {
    for (const slot of existingSlots) merged.set(openHouseSlotKey(slot), slot);
  }

  for (const removedKey of changes.removedKeys) merged.delete(removedKey);
  for (const slot of changes.upserts) merged.set(openHouseSlotKey(slot), slot);

  return [...merged.values()].sort((left, right) =>
    left.startDateTime.localeCompare(right.startDateTime),
  );
}

function openHouseSlotKey(slot: SyncedOpenHouseSlot): string {
  return slot.openHouseKey ?? `${slot.date}|${slot.startTime}|${slot.endTime}`;
}

function parseStoredSchedule(schedule: Prisma.JsonValue): SyncedOpenHouseSlot[] {
  if (!Array.isArray(schedule)) return [];

  return schedule.flatMap((value) => {
    if (!isRecord(value)) return [];
    const date = stringValue(value.date);
    const startTime = stringValue(value.startTime);
    const endTime = stringValue(value.endTime);
    const startDateTime = stringValue(value.startDateTime);
    const endDateTime = stringValue(value.endDateTime);
    if (!date || !startTime || !endTime || !startDateTime || !endDateTime) return [];

    return [{
      date,
      startTime,
      endTime,
      startDateTime,
      endDateTime,
      remarks: stringValue(value.remarks),
      openHouseKey: stringValue(value.openHouseKey),
    }];
  });
}

export async function clearExpiredOpenHouseSchedules(now: Date): Promise<number> {
  const pageSize = 1000;
  let afterId: string | undefined;
  let cleared = 0;

  while (true) {
    const listings = await prisma.listing.findMany({
      where: {
        openHouseSchedule: { not: Prisma.JsonNull },
        ...(afterId ? { id: { gt: afterId } } : {}),
      },
      select: { id: true, openHouseSchedule: true },
      orderBy: { id: "asc" },
      take: pageSize,
    });
    if (listings.length === 0) break;

    const expiredIds = listings
      .filter((listing) => scheduleIsExpired(listing.openHouseSchedule, now))
      .map((listing) => listing.id);

    if (expiredIds.length > 0) {
      const result = await prisma.listing.updateMany({
        where: { id: { in: expiredIds } },
        data: { openHouseSchedule: Prisma.JsonNull },
      });
      cleared += result.count;
    }

    afterId = listings.at(-1)?.id;
    if (listings.length < pageSize || !afterId) break;
  }

  return cleared;
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
