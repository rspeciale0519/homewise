import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateListingEmbedding } from "@/lib/ai/embeddings";
import { withIdx } from "@/lib/mls-visibility";

const CRON_BATCH_SIZE = 100;
const BACKFILL_BATCH_SIZE = 25;
const BACKFILL_MAX_BATCHES = 8;

export const generateListingEmbeddings = inngest.createFunction(
  { id: "generate-listing-embeddings", concurrency: { limit: 1 } },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const listings = await step.run("fetch-listings-without-embeddings", () =>
      fetchListingsWithoutEmbeddings(CRON_BATCH_SIZE)
    );

    let generated = 0;

    for (const listing of listings) {
      await step.run(`embed-${listing.id}`, async () => {
        await generateListingEmbedding(listing.id);
        generated++;
      });
    }

    return { processed: listings.length, generated };
  },
);

export const generateBackfilledListingEmbeddings = inngest.createFunction(
  { id: "generate-backfilled-listing-embeddings", concurrency: { limit: 1 } },
  { event: "mls/listing.backfilled" },
  async ({ step }) => {
    let processed = 0;
    let generated = 0;

    for (let batch = 0; batch < BACKFILL_MAX_BATCHES; batch++) {
      const listings = await step.run(`fetch-backfill-batch-${batch + 1}`, () =>
        fetchListingsWithoutEmbeddings(BACKFILL_BATCH_SIZE)
      );

      if (listings.length === 0) break;
      processed += listings.length;

      for (const listing of listings) {
        await step.run(`embed-backfill-${listing.id}`, async () => {
          await generateListingEmbedding(listing.id);
          generated++;
        });
      }

      await step.sleep(`embedding-backfill-throttle-${batch + 1}`, "1s");
    }

    return { processed, generated, maxBatches: BACKFILL_MAX_BATCHES };
  },
);

export const generateSingleEmbedding = inngest.createFunction(
  { id: "generate-single-embedding" },
  { event: "mls/listing.synced" },
  async ({ event, step }) => {
    const { id, listingId } = event.data as { id?: string; listingId: string };

    await step.run("generate-embedding", async () => {
      await generateListingEmbedding(id ?? listingId);
    });
  },
);

function fetchListingsWithoutEmbeddings(take: number) {
  return prisma.listing.findMany({
    where: withIdx({
      status: "Active",
      embedding: { isEmpty: true },
    }),
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take,
  });
}
