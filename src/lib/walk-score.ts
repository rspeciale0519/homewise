import { prisma } from "@/lib/prisma";
import { appendFileSync } from "fs";

const API_KEY = process.env.WALK_SCORE_API_KEY ?? "";
const BASE_URL = "https://api.walkscore.com/score";
const LOG_FILE = "/tmp/walkscore-debug.log";

function debug(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const logMessage = data ? `${timestamp} - ${message}: ${JSON.stringify(data)}` : `${timestamp} - ${message}`;
  try {
    appendFileSync(LOG_FILE, logMessage + "\n");
  } catch {
    // Ignore file write errors
  }
}

interface WalkScoreResult {
  walkScore: number | null;
  walkScoreDescription: string | null;
  transitScore: number | null;
  transitScoreDescription: string | null;
  bikeScore: number | null;
  bikeScoreDescription: string | null;
}

export async function getWalkScore(address: string, lat: number, lng: number): Promise<WalkScoreResult | null> {
  debug("getWalkScore called", { address, lat, lng });

  if (!API_KEY) {
    debug("API_KEY is not set");
    return null;
  }

  const addressKey = `${address}|${lat.toFixed(4)},${lng.toFixed(4)}`;

  const cached = await prisma.walkScoreCache.findUnique({ where: { addressKey } });
  if (cached && cached.expiresAt > new Date()) {
    debug("Using cached result", { address, walkScore: cached.walkScore });
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
    url.searchParams.set("wsapikey", API_KEY);

    debug("Fetching from URL", { url: url.toString() });
    const res = await fetch(url.toString());
    debug("Response received", { status: res.status, statusText: res.statusText });

    if (!res.ok) {
      debug("Response not ok", { status: res.status });
      return null;
    }

    const data = (await res.json()) as {
      walkscore?: number;
      description?: string;
      transit?: { score?: number; description?: string };
      bike?: { score?: number; description?: string };
    };

    debug("API response data", data);

    const result: WalkScoreResult = {
      walkScore: data.walkscore ?? null,
      walkScoreDescription: data.description ?? null,
      transitScore: data.transit?.score ?? null,
      transitScoreDescription: data.transit?.description ?? null,
      bikeScore: data.bike?.score ?? null,
      bikeScoreDescription: data.bike?.description ?? null,
    };

    debug("Parsed result", result);

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

    debug("Cached result", { address, walkScore: result.walkScore });
    return result;
  } catch (error) {
    debug("Error fetching data", error instanceof Error ? error.message : String(error));
    return null;
  }
}
