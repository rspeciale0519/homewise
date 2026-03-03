import { prisma } from "@/lib/prisma";

const API_KEY = process.env.WALK_SCORE_API_KEY ?? "";
const BASE_URL = "https://api.walkscore.com/score";

interface WalkScoreResult {
  walkScore: number | null;
  transitScore: number | null;
  bikeScore: number | null;
  description: string | null;
}

export async function getWalkScore(address: string, lat: number, lng: number): Promise<WalkScoreResult | null> {
  if (!API_KEY) return null;

  const addressKey = `${address}|${lat.toFixed(4)},${lng.toFixed(4)}`;

  const cached = await prisma.walkScoreCache.findUnique({ where: { addressKey } });
  if (cached && cached.expiresAt > new Date()) {
    return {
      walkScore: cached.walkScore,
      transitScore: cached.transitScore,
      bikeScore: cached.bikeScore,
      description: cached.description,
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
    url.searchParams.set("wsapikey", API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as {
      walkscore?: number;
      transit?: { score?: number };
      bike?: { score?: number };
      description?: string;
    };

    const result: WalkScoreResult = {
      walkScore: data.walkscore ?? null,
      transitScore: data.transit?.score ?? null,
      bikeScore: data.bike?.score ?? null,
      description: data.description ?? null,
    };

    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.walkScoreCache.upsert({
      where: { addressKey },
      update: {
        ...result,
        rawResponse: data as object,
        fetchedAt: new Date(),
        expiresAt: thirtyDays,
      },
      create: {
        addressKey,
        ...result,
        rawResponse: data as object,
        expiresAt: thirtyDays,
      },
    });

    return result;
  } catch {
    return null;
  }
}
