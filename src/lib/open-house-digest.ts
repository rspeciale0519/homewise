export type DigestSlot = {
  date: string;
  startTime: string;
  endTime: string;
  startDateTime?: string;
  endDateTime?: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function upcomingSlots(schedule: unknown, now: Date): DigestSlot[] {
  if (!Array.isArray(schedule)) return [];
  const horizon = new Date(now.getTime() + WEEK_MS);

  return schedule.filter((slot): slot is DigestSlot => {
    if (typeof slot !== "object" || slot === null) return false;
    const candidate = slot as Record<string, unknown>;
    if (typeof candidate.date !== "string") return false;

    const end =
      typeof candidate.endDateTime === "string"
        ? new Date(candidate.endDateTime)
        : new Date(`${candidate.date}T23:59:59Z`);
    const start =
      typeof candidate.startDateTime === "string"
        ? new Date(candidate.startDateTime)
        : new Date(`${candidate.date}T00:00:00Z`);

    if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) return false;
    return end >= now && start <= horizon;
  });
}

export type AlertCriteria = {
  cities: string[];
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
};

export function listingMatchesAlert(
  listing: { city: string; price: number; beds: number },
  alert: AlertCriteria,
): boolean {
  if (
    alert.cities.length > 0 &&
    !alert.cities.some((c) => c.toLowerCase() === listing.city.toLowerCase())
  ) {
    return false;
  }
  if (alert.minPrice != null && listing.price < alert.minPrice) return false;
  if (alert.maxPrice != null && listing.price > alert.maxPrice) return false;
  if (alert.beds != null && listing.beds < alert.beds) return false;
  return true;
}
