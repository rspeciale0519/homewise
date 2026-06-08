import type Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { ChatbotEngine, type ContextBundle } from "./engine";
import { prisma } from "@/lib/prisma";
import { semanticSearch } from "@/lib/ai/embeddings";
import { withIdx } from "@/lib/mls-visibility";

const SYSTEM_PROMPT = `You are a friendly real estate assistant for Homewise FL, a real estate brokerage in Florida.

Help users find homes, answer questions about the home buying process, and connect them with agents.

When users describe what they're looking for, use the search_listings tool to find matching properties.
When users ask about a specific neighborhood or area, provide helpful information.
Always be warm, professional, and knowledgeable about Central Florida real estate.
When naming or recommending a listing, include its brokerage attribution from the tool result.

If a user seems ready to schedule a showing or wants to speak with an agent, encourage them to use the contact form or schedule a showing.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_listings",
    description: "Search for real estate listings based on criteria like location, price, bedrooms, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Natural language search query" },
        city: { type: "string", description: "City name to filter by" },
        minPrice: { type: "number", description: "Minimum price" },
        maxPrice: { type: "number", description: "Maximum price" },
        beds: { type: "number", description: "Minimum bedrooms" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_listing_details",
    description: "Get detailed information about a specific listing by MLS ID",
    input_schema: {
      type: "object" as const,
      properties: {
        mlsId: { type: "string", description: "MLS listing ID" },
      },
      required: ["mlsId"],
    },
  },
];

export function createPublicChatbot(sessionId: string, userId?: string): ChatbotEngine {
  const context: ContextBundle = {
    config: "public",
    systemPrompt: SYSTEM_PROMPT,
    tools: TOOLS,
    sessionId,
    userId,
  };

  const engine = new ChatbotEngine(context);

  engine.registerTool("search_listings", async (input) => {
    const query = input.query as string;
    const results = await semanticSearch(query, 6, {
      city: input.city as string | undefined,
      minPrice: input.minPrice as number | undefined,
      maxPrice: input.maxPrice as number | undefined,
      beds: input.beds as number | undefined,
    });

    if (results.length === 0) {
      // Fallback to database text search
      const where: Prisma.ListingWhereInput = withIdx({ status: "Active" });
      if (input.city) where.city = { equals: String(input.city), mode: "insensitive" };
      if (input.minPrice) where.price = { gte: Number(input.minPrice) };
      if (input.maxPrice) where.price = { ...((where.price as Prisma.FloatFilter) ?? {}), lte: Number(input.maxPrice) };
      if (input.beds) where.beds = { gte: Number(input.beds) };

      const listings = await prisma.listing.findMany({
        where,
        select: {
          mlsId: true,
          listingId: true,
          address: true,
          city: true,
          price: true,
          beds: true,
          baths: true,
          sqft: true,
          status: true,
          listingOfficeName: true,
        },
        orderBy: { price: "asc" },
        take: 6,
      });

      return { results: listings.map(withListingAttribution), source: "database" };
    }

    return { results: results.map(withListingAttribution), source: "semantic" };
  });

  engine.registerTool("get_listing_details", async (input) => {
    const listing = await prisma.listing.findFirst({
      where: withIdx({ mlsId: input.mlsId as string }),
      select: {
        mlsId: true, listingId: true, address: true, city: true, state: true, zip: true,
        price: true, beds: true, baths: true, sqft: true, propertyType: true,
        yearBuilt: true, description: true, hasPool: true, hasWaterfront: true,
        hoaFee: true, lotSize: true, garageSpaces: true, daysOnMarket: true,
        walkScore: true, transitScore: true, bikeScore: true, status: true,
        listingOfficeName: true,
      },
    });
    return listing ? withListingAttribution(listing) : { error: "Listing not found" };
  });

  return engine;
}

function withListingAttribution<T extends {
  mlsId: string;
  listingId?: string | null;
  listingOfficeName?: string | null;
  status?: string | null;
}>(listing: T): T & { attribution: string } {
  const listingNumber = listing.listingId ?? listing.mlsId;
  const office = listing.listingOfficeName ?? "the listing brokerage";
  const status = listing.status ? ` | ${listing.status}` : "";
  return {
    ...listing,
    attribution: `Courtesy of ${office}. Listing #${listingNumber}${status}.`,
  };
}
