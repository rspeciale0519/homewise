import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateListingEmbedding } from "@/lib/ai/embeddings";

export const generateListingEmbeddings = inngest.createFunction(
  { id: "generate-listing-embeddings", concurrency: { limit: 1 } },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const listings = await step.run("fetch-listings-without-embeddings", async () => {
      return prisma.listing.findMany({
        where: {
          status: "Active",
          embedding: { isEmpty: true },
        },
        select: { id: true },
        take: 100,
      });
    });

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

export const generateSingleEmbedding = inngest.createFunction(
  { id: "generate-single-embedding" },
  { event: "mls/listing.synced" },
  async ({ event, step }) => {
    const { listingId } = event.data as { listingId: string };

    await step.run("generate-embedding", async () => {
      await generateListingEmbedding(listingId);
    });
  },
);
