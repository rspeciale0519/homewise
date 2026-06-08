import type { Prisma, SyncState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPropertyUrl, fetchPage, hasCredentials } from "@/lib/mls-grid";
import { storageKeyFor } from "@/lib/mls-image";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResoProperty } from "@/types/reso";
import { inngest } from "../client";
import { syncOpenHouses } from "./mls-openhouse";
import {
  detectPriceChange,
  mapResoToListingData,
  type ListingSyncData,
} from "./mls-sync.mapper";

export { detectPriceChange, mapResoToListingData } from "./mls-sync.mapper";

const PROVIDER = "stellar";
const PHOTO_BUCKET = "mls-photos";
const PAGE_SIZE = 200;
const PAGES_PER_RUN = 10;

type SyncEventData = {
  nextLink?: string;
  cursor?: string;
  initialImport?: boolean;
};

type BeginSyncResult =
  | { skipped: true; state: SyncState }
  | { skipped: false; state: SyncState };

type ProcessPageResult = {
  processed: number;
  upserted: number;
  deleted: number;
  maxCursor?: string;
};

export const mlsSync = inngest.createFunction(
  {
    id: "mls-sync",
    name: "MLS Grid Sync",
    retries: 2,
  },
  [{ cron: "*/15 * * * *" }, { event: "mls-sync" }, { event: "mls/sync.continue" }],
  async ({ event, step }) => {
    if (!hasCredentials()) {
      return { skipped: true, reason: "No MLS Grid credentials configured" };
    }

    const eventData = parseSyncEventData(event.data);
    const begin = await step.run("begin-sync", async (): Promise<BeginSyncResult> => {
      const current = await prisma.syncState.findUnique({
        where: { provider: PROVIDER },
      });

      if (isCronInvocation(event.name) && current?.status === "syncing") {
        return { skipped: true, state: current };
      }

      const state = await prisma.syncState.upsert({
        where: { provider: PROVIDER },
        update: { status: "syncing", updatedAt: new Date() },
        create: { provider: PROVIDER, status: "syncing" },
      });

      return { skipped: false, state };
    });

    if (begin.skipped) {
      return { skipped: "backfill-in-flight" };
    }

    try {
      const continuation = Boolean(eventData.nextLink);
      const initialImport =
        eventData.initialImport ?? (!begin.state.cursor && !continuation);
      const modifiedAfter = eventData.cursor ?? begin.state.cursor ?? undefined;
      let maxCursor = modifiedAfter;
      let nextLink = eventData.nextLink;
      let totalProcessed = 0;
      let totalUpserted = 0;
      let totalDeleted = 0;

      for (let pageIndex = 0; pageIndex < PAGES_PER_RUN; pageIndex++) {
        const pageUrl =
          nextLink ??
          buildPropertyUrl({ modifiedAfter, initialImport, top: PAGE_SIZE });
        const page = await step.run(`fetch-property-page-${pageIndex}`, async () => {
          return fetchPage(pageUrl);
        });

        if (initialImport && !continuation && pageIndex === 0 && page.value.length === 0) {
          throw new Error(
            "MLS Grid initial import returned zero rows; verify OriginatingSystemName",
          );
        }

        const result = await step.run(`process-property-page-${pageIndex}`, async () => {
          return processPropertyPage(page.value, { initialImport });
        });

        totalProcessed += result.processed;
        totalUpserted += result.upserted;
        totalDeleted += result.deleted;
        maxCursor = maxIsoTimestamp(maxCursor, result.maxCursor);

        await step.run(`persist-property-cursor-${pageIndex}`, async () => {
          return prisma.syncState.update({
            where: { provider: PROVIDER },
            data: {
              cursor: maxCursor,
              lastSyncAt: new Date(),
              totalSynced: { increment: result.upserted },
              lastError: null,
            },
          });
        });

        nextLink = page["@odata.nextLink"];
        if (!nextLink) break;
      }

      if (nextLink) {
        await step.sendEvent("continue-property-sync", {
          name: "mls/sync.continue",
          data: { nextLink, cursor: maxCursor, initialImport },
        });
        return {
          status: "continued",
          processed: totalProcessed,
          upserted: totalUpserted,
          deleted: totalDeleted,
          cursor: maxCursor,
        };
      }

      const openHouses = await syncOpenHouses(step);

      await step.run("update-sync-success", async () => {
        return prisma.syncState.update({
          where: { provider: PROVIDER },
          data: {
            status: "idle",
            lastSyncAt: new Date(),
            cursor: maxCursor,
            lastError: null,
          },
        });
      });

      if (initialImport) {
        await step.sendEvent("emit-backfill-complete", {
          name: "mls/listing.backfilled",
          data: { provider: PROVIDER, total: totalUpserted, cursor: maxCursor },
        });
      }

      return {
        status: "success",
        processed: totalProcessed,
        upserted: totalUpserted,
        deleted: totalDeleted,
        openHouses,
        cursor: maxCursor,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.syncState.upsert({
        where: { provider: PROVIDER },
        update: { status: "error", lastError: message },
        create: { provider: PROVIDER, status: "error", lastError: message },
      });
      throw error;
    }
  },
);

function parseSyncEventData(data: unknown): SyncEventData {
  if (!isRecord(data)) return {};

  return {
    nextLink: stringValue(data.nextLink),
    cursor: stringValue(data.cursor),
    initialImport: typeof data.initialImport === "boolean" ? data.initialImport : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isCronInvocation(eventName: string): boolean {
  return eventName === "inngest/scheduled.timer";
}

function maxIsoTimestamp(left?: string, right?: string): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function updateDataFor(mapped: ListingSyncData): Prisma.ListingUncheckedUpdateInput {
  const { mlsId: _mlsId, mlsSource: _mlsSource, ...update } = mapped;
  return update;
}

async function processPropertyPage(
  listings: ResoProperty[],
  options: { initialImport: boolean },
): Promise<ProcessPageResult> {
  let upserted = 0;
  let deleted = 0;
  let maxCursor: string | undefined;

  for (const listing of listings) {
    maxCursor = maxIsoTimestamp(maxCursor, listing.ModificationTimestamp);

    if (listing.MlgCanView === false) {
      await deleteListingAndCachedPhotos(listing.ListingKey);
      deleted++;
      continue;
    }

    await upsertListing(listing, options);
    upserted++;
  }

  return { processed: listings.length, upserted, deleted, maxCursor };
}

async function deleteListingAndCachedPhotos(mlsId: string): Promise<void> {
  const existing = await prisma.listing.findUnique({
    where: { mlsId },
    select: { photoSources: true },
  });

  if (existing?.photoSources.length) {
    await purgeCachedPhotoSources(existing.photoSources);
  }

  await prisma.listing.deleteMany({ where: { mlsId } });
}

async function purgeCachedPhotoSources(photoSources: string[]): Promise<void> {
  const storageKeys = [...new Set(photoSources.map((source) => storageKeyFor(source)))];
  if (storageKeys.length === 0) return;

  const { error } = await createAdminClient().storage
    .from(PHOTO_BUCKET)
    .remove(storageKeys);

  if (error) {
    throw new Error(`MLS photo purge failed: ${error.message}`);
  }
}

async function upsertListing(
  reso: ResoProperty,
  options: { initialImport: boolean },
): Promise<void> {
  const mapped = mapResoToListingData(reso);
  const existing = await prisma.listing.findUnique({
    where: { mlsId: mapped.mlsId },
    select: { id: true, price: true },
  });
  const saved = await prisma.listing.upsert({
    where: { mlsId: mapped.mlsId },
    update: updateDataFor(mapped),
    create: mapped,
    select: { id: true },
  });

  if (options.initialImport) return;

  if (existing && detectPriceChange(existing, reso)) {
    await inngest.send({
      name: "mls/listing.price-changed",
      data: {
        listingId: mapped.mlsId,
        mlsId: mapped.mlsId,
        id: saved.id,
        oldPrice: existing.price,
        newPrice: reso.ListPrice,
        address: mapped.address,
        city: mapped.city,
      },
    });
  }

  await inngest.send({
    name: "mls/listing.synced",
    data: { listingId: mapped.mlsId, mlsId: mapped.mlsId, id: saved.id },
  });
}
