import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) throw new Error("Failed to generate embedding");
  return embedding;
}

export function buildListingEmbeddingText(listing: {
  address: string;
  city: string;
  description?: string | null;
  remarks?: string | null;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  subdivision?: string | null;
  hasPool?: boolean;
  hasWaterfront?: boolean;
  yearBuilt?: number | null;
}): string {
  const parts: string[] = [
    `${listing.propertyType} at ${listing.address}, ${listing.city}`,
    `${listing.beds} bedrooms, ${listing.baths} bathrooms, ${listing.sqft} sqft`,
    `Listed at $${listing.price.toLocaleString()}`,
  ];

  if (listing.yearBuilt) parts.push(`Built in ${listing.yearBuilt}`);
  if (listing.subdivision) parts.push(`in ${listing.subdivision}`);
  if (listing.hasPool) parts.push("has a pool");
  if (listing.hasWaterfront) parts.push("waterfront property");
  if (listing.description) parts.push(listing.description.slice(0, 500));
  if (listing.remarks) parts.push(listing.remarks.slice(0, 500));

  return parts.join(". ");
}

export async function generateListingEmbedding(listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  const text = buildListingEmbeddingText(listing);
  const embedding = await generateEmbedding(text);

  await prisma.listing.update({
    where: { id: listingId },
    data: { embedding, embeddingText: text },
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function semanticSearch(
  query: string,
  limit = 10,
  filters?: { city?: string; minPrice?: number; maxPrice?: number; beds?: number },
): Promise<{ id: string; mlsId: string; address: string; city: string; price: number; beds: number; baths: number; sqft: number; similarity: number }[]> {
  const queryEmbedding = await generateEmbedding(query);

  const where: Record<string, unknown> = {
    status: "Active",
    embedding: { isEmpty: false },
  };
  if (filters?.city) where.city = { equals: filters.city, mode: "insensitive" };
  if (filters?.minPrice) where.price = { ...((where.price as Record<string, unknown>) ?? {}), gte: filters.minPrice };
  if (filters?.maxPrice) where.price = { ...((where.price as Record<string, unknown>) ?? {}), lte: filters.maxPrice };
  if (filters?.beds) where.beds = { gte: filters.beds };

  const listings = await prisma.listing.findMany({
    where,
    select: {
      id: true,
      mlsId: true,
      address: true,
      city: true,
      price: true,
      beds: true,
      baths: true,
      sqft: true,
      embedding: true,
    },
    take: 500,
  });

  const scored = listings
    .map((listing) => ({
      id: listing.id,
      mlsId: listing.mlsId,
      address: listing.address,
      city: listing.city,
      price: listing.price,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
      similarity: cosineSimilarity(queryEmbedding, listing.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}
