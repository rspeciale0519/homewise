import { prisma } from "@/lib/prisma";
import { contactMatchesListing } from "@/lib/client-matching";
import { withIdx } from "@/lib/mls-visibility";
import { inngest } from "../client";

const CONTACT_PREF_SELECT = {
  id: true,
  assignedAgentId: true,
  prefBudgetMin: true,
  prefBudgetMax: true,
  prefCities: true,
  prefMinBeds: true,
} as const;

const LISTING_MATCH_SELECT = {
  id: true,
  price: true,
  city: true,
  beds: true,
  status: true,
} as const;

async function matchListingToContacts(listingId: string): Promise<number> {
  const listing = await prisma.listing.findFirst({
    where: withIdx({ id: listingId }),
    select: LISTING_MATCH_SELECT,
  });
  if (!listing || listing.status !== "Active") return 0;

  const contacts = await prisma.contact.findMany({
    where: {
      assignedAgentId: { not: null },
      OR: [
        { prefBudgetMin: { not: null } },
        { prefBudgetMax: { not: null } },
        { prefMinBeds: { not: null } },
        { prefCities: { isEmpty: false } },
      ],
    },
    select: CONTACT_PREF_SELECT,
  });

  const matches = contacts.filter((contact) => contactMatchesListing(contact, listing));
  if (matches.length === 0) return 0;

  const result = await prisma.clientListingMatch.createMany({
    data: matches.map((contact) => ({
      contactId: contact.id,
      listingId: listing.id,
      agentId: contact.assignedAgentId as string,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

export const clientListingMatcher = inngest.createFunction(
  { id: "client-listing-matcher", concurrency: { limit: 4 } },
  { event: "mls/listing.synced" },
  async ({ event, step }) => {
    const { id, listingId } = event.data as { id?: string; listingId: string };

    const created = await step.run("match-contacts", () =>
      matchListingToContacts(id ?? listingId),
    );

    return { created };
  },
);

export const dailyClientMatchSweep = inngest.createFunction(
  { id: "daily-client-match-sweep" },
  { cron: "0 11 * * *" }, // 6am ET daily
  async ({ step }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await step.run("recent-listings", () =>
      prisma.listing.findMany({
        where: withIdx({ status: "Active", syncedAt: { gte: since } }),
        select: { id: true },
        take: 500,
        orderBy: { syncedAt: "desc" },
      }),
    );

    let created = 0;
    for (const listing of recent) {
      created += await step.run(`match-${listing.id}`, () =>
        matchListingToContacts(listing.id),
      );
    }

    return { scanned: recent.length, created };
  },
);
