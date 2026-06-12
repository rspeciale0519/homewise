import { prisma } from "@/lib/prisma";
import {
  hasSignals,
  profileFromSignals,
  scoreListing,
  type CandidateListing,
  type RecommendationProfile,
} from "@/lib/recommendations";

const BEHAVIOR_SELECT = {
  price: true,
  city: true,
  beds: true,
  hasPool: true,
  hasWaterfront: true,
} as const;

export async function matchProfileForUser(userId: string): Promise<RecommendationProfile | null> {
  const [favorites, recents, searches] = await Promise.all([
    prisma.favoriteProperty.findMany({
      where: { userId },
      orderBy: { savedAt: "desc" },
      take: 20,
      select: { propertyId: true },
    }),
    prisma.recentlyViewed.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: 20,
      select: { propertyId: true },
    }),
    prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { filters: true },
    }),
  ]);

  const ids = [...new Set([...favorites, ...recents].map((row) => row.propertyId))];
  const behavior = ids.length
    ? await prisma.listing.findMany({ where: { id: { in: ids } }, select: BEHAVIOR_SELECT })
    : [];

  const preferred = preferredFromSavedSearches(searches.map((s) => s.filters));
  const profile = profileFromSignals({ preferred, behavior });
  return hasSignals(profile) ? profile : null;
}

function preferredFromSavedSearches(filtersList: unknown[]): Partial<RecommendationProfile> {
  const preferred: Partial<RecommendationProfile> = {};

  for (const raw of filtersList) {
    if (typeof raw !== "object" || raw === null) continue;
    const filters = raw as Record<string, unknown>;

    if (typeof filters.minPrice === "number") {
      preferred.priceMin = Math.min(preferred.priceMin ?? Infinity, filters.minPrice);
    }
    if (typeof filters.maxPrice === "number") {
      preferred.priceMax = Math.max(preferred.priceMax ?? 0, filters.maxPrice);
    }
    if (typeof filters.beds === "number") {
      preferred.minBeds = Math.min(preferred.minBeds ?? Infinity, filters.beds);
    }
    if (typeof filters.location === "string" && filters.location.trim()) {
      preferred.cities = [
        ...new Set([...(preferred.cities ?? []), filters.location.trim().toLowerCase()]),
      ];
    }
  }

  if (preferred.priceMin === Infinity) delete preferred.priceMin;
  if (preferred.minBeds === Infinity) delete preferred.minBeds;
  return preferred;
}

export function scoreProperties(
  profile: RecommendationProfile,
  properties: Array<Pick<CandidateListing, "id" | "price" | "city" | "beds" | "status"> & {
    hasPool?: boolean;
    hasWaterfront?: boolean;
  }>,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const property of properties) {
    const score = scoreListing(profile, property);
    if (score > 0) scores[property.id] = score;
  }
  return scores;
}
