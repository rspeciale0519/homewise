import type { Prisma, SyncState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPropertyUrl, fetchPage, hasCredentials } from "@/lib/mls-grid";
import { storageKeyFor } from "@/lib/mls-image";
import { aiStyleTags } from "@/lib/listing-tags";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import { withIdx } from "@/lib/mls-visibility";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResoProperty } from "@/types/reso";
import { inngest } from "../client";
import { syncOpenHouses } from "./mls-openhouse";
import {
  detectPriceChange,
  mapResoToListingData,
  priceHistoryEntriesFor,
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
  | { initialImport: boolean; skipped: false; state: SyncState };

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

      const continuation = Boolean(eventData.nextLink);
      const initialImport =
        eventData.initialImport ?? (!current?.cursor && !continuation);
      const metadata = syncRunMetadata(initialImport);
      const state = await prisma.syncState.upsert({
        where: { provider: PROVIDER },
        update: { metadata, status: "syncing", updatedAt: new Date() },
        create: { metadata, provider: PROVIDER, status: "syncing" },
      });

      return { initialImport, skipped: false, state };
    });

    if (begin.skipped) {
      return { skipped: "backfill-in-flight" };
    }

    try {
      const continuation = Boolean(eventData.nextLink);
      const initialImport = begin.initialImport;
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
        const result = await step.run(`sync-property-page-${pageIndex}`, async () => {
          const page = await fetchPage(pageUrl);

          if (initialImport && !continuation && pageIndex === 0 && page.value.length === 0) {
            throw new Error(
              "MLS Grid initial import returned zero rows; verify OriginatingSystemName",
            );
          }

          const processed = await processPropertyPage(page.value, { initialImport });
          return { ...processed, nextLink: page["@odata.nextLink"] ?? null };
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

        nextLink = result.nextLink ?? undefined;
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
      const agentMatches = initialImport
        ? await step.run("warn-agent-listing-matches", warnAgentsWithoutListingMatches)
        : undefined;

      await step.run("update-sync-success", async () => {
        return prisma.syncState.update({
          where: { provider: PROVIDER },
          data: {
            status: "idle",
            lastSyncAt: new Date(),
            cursor: maxCursor,
            lastError: null,
            metadata: {
              backfillAlertsSuppressed: false,
              completedAt: new Date().toISOString(),
              initialImport,
            },
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
        agentMatches,
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

function syncRunMetadata(initialImport: boolean): Prisma.InputJsonObject {
  return {
    backfillAlertsSuppressed: initialImport,
    initialImport,
    startedAt: new Date().toISOString(),
  };
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

function updateDataFor(mapped: ListingSyncData): Prisma.ListingUncheckedUpdateInput {
  const { mlsId: _mlsId, mlsSource: _mlsSource, ...update } = mapped;
  return update;
}

const PAGE_WRITE_CONCURRENCY = 10;

async function processPropertyPage(
  listings: ResoProperty[],
  options: { initialImport: boolean },
): Promise<ProcessPageResult> {
  let upserted = 0;
  let deleted = 0;
  let maxCursor: string | undefined;

  for (const listing of listings) {
    maxCursor = maxIsoTimestamp(maxCursor, listing.ModificationTimestamp);
  }

  for (let i = 0; i < listings.length; i += PAGE_WRITE_CONCURRENCY) {
    const chunk = listings.slice(i, i + PAGE_WRITE_CONCURRENCY);
    const outcomes = await Promise.all(
      chunk.map(async (listing) => {
        if (listing.MlgCanView === false) {
          await deleteListingAndCachedPhotos(listing.ListingKey);
          return "deleted" as const;
        }
        await upsertListing(listing, options);
        return "upserted" as const;
      }),
    );

    for (const outcome of outcomes) {
      if (outcome === "deleted") deleted++;
      else upserted++;
    }
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

  // AI styling tags only on incremental syncs (low volume) and only when the key exists.
  if (!options.initialImport && process.env.OPENAI_API_KEY) {
    const styleTags = await aiStyleTags({
      description: reso.PublicRemarks,
      propertyType: reso.PropertyType,
    }).catch(() => []);
    mapped.tags = [...new Set([...(mapped.tags as string[]), ...styleTags])].sort();
  }

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

  const historyEntries = priceHistoryEntriesFor(existing, {
    price: mapped.price as number,
    originalListPrice: mapped.originalListPrice as number | null,
    listDate: toDateOrNull(mapped.listDate),
    mlsLastModified: toDateOrNull(mapped.mlsLastModified),
    syncedAt: toDateOrNull(mapped.syncedAt) ?? new Date(),
  });
  if (historyEntries.length > 0) {
    await prisma.priceHistory.createMany({
      data: historyEntries.map((entry) => ({ ...entry, listingId: saved.id })),
    });
  }

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

async function warnAgentsWithoutListingMatches(): Promise<{
  checked: number;
  unmatched: Array<{ agentId: string; mlsAgentId: string; name: string }>;
}> {
  const agents = await prisma.agent.findMany({
    where: { active: true, mlsAgentId: { not: null } },
    select: { id: true, firstName: true, lastName: true, mlsAgentId: true },
  });
  const unmatched: Array<{ agentId: string; mlsAgentId: string; name: string }> = [];

  for (const agent of agents) {
    const mlsAgentId = normalizeMlsAgentId(agent.mlsAgentId);
    if (!mlsAgentId) continue;

    const listingCount = await prisma.listing.count({
      where: withIdx({ listingAgentMlsId: mlsAgentId }),
    });

    if (listingCount === 0) {
      const name = `${agent.firstName} ${agent.lastName}`;
      console.warn(`[mls-sync] Agent ${name} (${mlsAgentId}) has zero matched IDX listings`);
      unmatched.push({ agentId: agent.id, mlsAgentId, name });
    }
  }

  return { checked: agents.length, unmatched };
}
