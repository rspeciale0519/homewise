export type RecommendationProfile = {
  priceMin: number | null;
  priceMax: number | null;
  cities: string[];
  minBeds: number | null;
  wantsPool: boolean;
  wantsWaterfront: boolean;
};

export type BehaviorListing = {
  price: number;
  city: string;
  beds: number;
  hasPool?: boolean;
  hasWaterfront?: boolean;
};

export type CandidateListing = BehaviorListing & {
  id: string;
  status: string;
};

export function profileFromSignals(input: {
  preferred: Partial<RecommendationProfile>;
  behavior: BehaviorListing[];
}): RecommendationProfile {
  const { preferred, behavior } = input;
  const prices = behavior.map((l) => l.price).filter((p) => p > 0);

  return {
    priceMin: preferred.priceMin ?? (prices.length ? Math.round(Math.min(...prices) * 0.8) : null),
    priceMax: preferred.priceMax ?? (prices.length ? Math.round(Math.max(...prices) * 1.2) : null),
    cities:
      preferred.cities && preferred.cities.length > 0
        ? preferred.cities
        : [...new Set(behavior.map((l) => l.city.trim().toLowerCase()))],
    minBeds:
      preferred.minBeds ?? (behavior.length ? Math.min(...behavior.map((l) => l.beds)) : null),
    wantsPool: preferred.wantsPool ?? behavior.some((l) => l.hasPool === true),
    wantsWaterfront: preferred.wantsWaterfront ?? behavior.some((l) => l.hasWaterfront === true),
  };
}

export function hasSignals(profile: RecommendationProfile): boolean {
  return profile.priceMin != null || profile.priceMax != null || profile.cities.length > 0;
}

export function scoreListing(profile: RecommendationProfile, listing: CandidateListing): number {
  if (listing.status !== "Active") return 0;

  let score = 0;

  if (profile.cities.length > 0) {
    if (profile.cities.includes(listing.city.trim().toLowerCase())) score += 40;
  } else {
    score += 20;
  }

  const min = profile.priceMin ?? 0;
  const max = profile.priceMax ?? Number.MAX_SAFE_INTEGER;
  if (listing.price >= min && listing.price <= max) {
    score += 30;
  } else {
    const distance = listing.price < min ? min - listing.price : listing.price - max;
    const band = Math.max(max === Number.MAX_SAFE_INTEGER ? min : max - min, 1);
    score += Math.max(0, 30 - Math.round((distance / band) * 30));
  }

  if (profile.minBeds == null || listing.beds >= profile.minBeds) score += 15;
  if (profile.wantsPool && listing.hasPool) score += 8;
  if (profile.wantsWaterfront && listing.hasWaterfront) score += 7;

  return Math.min(100, score);
}

export function recommendListings<T extends CandidateListing>(
  profile: RecommendationProfile,
  candidates: T[],
  limit: number,
): Array<T & { score: number }> {
  return candidates
    .map((listing) => ({ ...listing, score: scoreListing(profile, listing) }))
    .filter((listing) => listing.score >= 40)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.price - b.price))
    .slice(0, limit);
}
