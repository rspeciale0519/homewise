import { describe, expect, it } from "vitest";
import { listingMatchesAlert, upcomingSlots } from "./open-house-digest";

const now = new Date("2026-06-12T00:00:00Z");

describe("upcomingSlots", () => {
  it("keeps only slots inside the next 7 days", () => {
    const slots = upcomingSlots(
      [
        { date: "2026-06-13", startTime: "1 PM", endTime: "3 PM", startDateTime: "2026-06-13T17:00:00Z", endDateTime: "2026-06-13T19:00:00Z" },
        { date: "2026-06-01", startTime: "1 PM", endTime: "3 PM", startDateTime: "2026-06-01T17:00:00Z", endDateTime: "2026-06-01T19:00:00Z" },
        { date: "2026-07-15", startTime: "1 PM", endTime: "3 PM", startDateTime: "2026-07-15T17:00:00Z", endDateTime: "2026-07-15T19:00:00Z" },
      ],
      now,
    );

    expect(slots).toHaveLength(1);
    expect(slots[0]!.date).toBe("2026-06-13");
  });

  it("handles malformed schedules gracefully", () => {
    expect(upcomingSlots(null, now)).toEqual([]);
    expect(upcomingSlots([{ bogus: true }], now)).toEqual([]);
  });
});

describe("listingMatchesAlert", () => {
  const listing = { city: "Orlando", price: 400_000, beds: 3 };

  it("applies city, price band, and beds criteria", () => {
    expect(listingMatchesAlert(listing, { cities: ["orlando"], minPrice: null, maxPrice: null, beds: null })).toBe(true);
    expect(listingMatchesAlert(listing, { cities: ["tampa"], minPrice: null, maxPrice: null, beds: null })).toBe(false);
    expect(listingMatchesAlert(listing, { cities: [], minPrice: 450_000, maxPrice: null, beds: null })).toBe(false);
    expect(listingMatchesAlert(listing, { cities: [], minPrice: null, maxPrice: 350_000, beds: null })).toBe(false);
    expect(listingMatchesAlert(listing, { cities: [], minPrice: null, maxPrice: null, beds: 4 })).toBe(false);
  });
});
