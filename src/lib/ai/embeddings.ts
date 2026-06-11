import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withIdx } from "@/lib/mls-visibility";

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
  const listing = await prisma.listing.findFirst({ where: withIdx({ id: listingId }) });
  if (!listing) return;

  const text = buildListingEmbeddingText(listing);
  const embedding = await generateEmbedding(text);
  const vectorLiteral = toVectorLiteral(embedding);

  await prisma.$executeRaw`
    UPDATE "Listing"
    SET
      "embedding" = ${embedding},
      "embeddingText" = ${text},
      "embeddingVector" = ${vectorLiteral}::vector
    WHERE "id" = ${listingId}
  `;
}

export async function semanticSearch(
  query: string,
  limit = 10,
  filters?: { city?: string; minPrice?: number; maxPrice?: number; beds?: number },
): Promise<{
  id: string;
  mlsId: string;
  listingId: string | null;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  listingOfficeName: string | null;
  similarity: number;
}[]> {
  const queryEmbedding = await generateEmbedding(query);
  const vectorLiteral = toVectorLiteral(queryEmbedding);

  const clauses: Prisma.Sql[] = [
    Prisma.sql`"mlgCanUse" @> ARRAY['IDX']::text[]`,
    Prisma.sql`"status" = 'Active'`,
    Prisma.sql`"embeddingVector" IS NOT NULL`,
  ];
  if (filters?.city) clauses.push(Prisma.sql`"city" ILIKE ${filters.city}`);
  if (filters?.minPrice) clauses.push(Prisma.sql`"price" >= ${filters.minPrice}`);
  if (filters?.maxPrice) clauses.push(Prisma.sql`"price" <= ${filters.maxPrice}`);
  if (filters?.beds) clauses.push(Prisma.sql`"beds" >= ${filters.beds}`);

  const rows = await prisma.$queryRaw<SemanticSearchRow[]>`
    SELECT
      "id",
      "mlsId",
      "listingId",
      "address",
      "city",
      "price",
      "beds",
      "baths",
      "sqft",
      "listingOfficeName",
      ("embeddingVector" <=> ${vectorLiteral}::vector) AS distance
    FROM "Listing"
    WHERE ${Prisma.join(clauses, " AND ")}
    ORDER BY "embeddingVector" <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    mlsId: row.mlsId,
    listingId: row.listingId,
    address: row.address,
    city: row.city,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    listingOfficeName: row.listingOfficeName,
    similarity: 1 - Number(row.distance),
  }));
}

interface SemanticSearchRow {
  id: string;
  mlsId: string;
  listingId: string | null;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  listingOfficeName: string | null;
  distance: number;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
