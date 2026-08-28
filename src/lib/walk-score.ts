import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BASE_URL = "https://api.walkscore.com/score";
const scoreSchema = z.number().int().min(0).max(100).nullable().optional();
const scoreDetailSchema = z.object({
  score: scoreSchema,
  description: z.string().max(200).nullable().optional(),
});
const walkScoreResponseSchema = z.object({
  walkscore: scoreSchema,
  description: z.string().max(200).nullable().optional(),
  transit: scoreDetailSchema.nullable().optional(),
  bike: scoreDetailSchema.nullable().optional(),
});

interface WalkScoreResult {
  walkScore: number | null;
  walkScoreDescription: string | null;
  transitScore: number | null;
  transitScoreDescription: string | null;
  bikeScore: number | null;
  bikeScoreDescription: string | null;
}

export async function getWalkScore(address: string, lat: number, lng: number): Promise<WalkScoreResult | null> {
  const apiKey = process.env.WALK_SCORE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const addressKey = `${address}|${lat.toFixed(4)},${lng.toFixed(4)}`;

  const cached = await prisma.walkScoreCache.findUnique({ where: { addressKey } });
  if (cached && cached.expiresAt > new Date()) {
    return {
      walkScore: cached.walkScore,
      walkScoreDescription: (cached.rawResponse as Record<string, unknown> | null)?.description as string ?? null,
      transitScore: cached.transitScore,
      transitScoreDescription: ((cached.rawResponse as Record<string, unknown> | null)?.transit as Record<string, unknown> | undefined)?.description as string ?? null,
      bikeScore: cached.bikeScore,
      bikeScoreDescription: ((cached.rawResponse as Record<string, unknown> | null)?.bike as Record<string, unknown> | undefined)?.description as string ?? null,
    };
  }

  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("format", "json");
    url.searchParams.set("address", address);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("transit", "1");
    url.searchParams.set("bike", "1");
    url.searchParams.set("wsapikey", apiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      return null;
    }

    const parsed = walkScoreResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      return null;
    }
    const data = parsed.data;

    const result: WalkScoreResult = {
      walkScore: data.walkscore ?? null,
      walkScoreDescription: data.description ?? null,
      transitScore: data.transit?.score ?? null,
      transitScoreDescription: data.transit?.description ?? null,
      bikeScore: data.bike?.score ?? null,
      bikeScoreDescription: data.bike?.description ?? null,
    };

    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.walkScoreCache.upsert({
      where: { addressKey },
      update: {
        walkScore: result.walkScore,
        transitScore: result.transitScore,
        bikeScore: result.bikeScore,
        description: result.walkScoreDescription,
        rawResponse: data as object,
        fetchedAt: new Date(),
        expiresAt: thirtyDays,
      },
      create: {
        addressKey,
        walkScore: result.walkScore,
        transitScore: result.transitScore,
        bikeScore: result.bikeScore,
        description: result.walkScoreDescription,
        rawResponse: data as object,
        expiresAt: thirtyDays,
      },
    });

    return result;
  } catch (error) {
    console.error("[walk-score] request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}
