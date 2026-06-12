import { describe, expect, it } from "vitest";
import { contactHasPreferences, contactMatchesListing } from "./client-matching";

const listing = { price: 450_000, city: "Winter Garden", beds: 4, status: "Active" };

describe("contactMatchesListing", () => {
  it("matches when all stated preferences hold", () => {
    expect(
      contactMatchesListing(
        { prefBudgetMin: 300_000, prefBudgetMax: 500_000, prefCities: ["winter garden"], prefMinBeds: 3 },
        listing,
      ),
    ).toBe(true);
  });

  it("fails on any violated preference", () => {
    const base = { prefBudgetMin: null, prefBudgetMax: null, prefCities: [], prefMinBeds: null };
    expect(contactMatchesListing({ ...base, prefBudgetMax: 400_000 }, listing)).toBe(false);
    expect(contactMatchesListing({ ...base, prefBudgetMin: 500_000 }, listing)).toBe(false);
    expect(contactMatchesListing({ ...base, prefMinBeds: 5 }, listing)).toBe(false);
    expect(contactMatchesListing({ ...base, prefCities: ["Tampa"] }, listing)).toBe(false);
  });

  it("never matches contacts without preferences or non-active listings", () => {
    const noPrefs = { prefBudgetMin: null, prefBudgetMax: null, prefCities: [], prefMinBeds: null };
    expect(contactHasPreferences(noPrefs)).toBe(false);
    expect(contactMatchesListing(noPrefs, listing)).toBe(false);
    expect(
      contactMatchesListing(
        { ...noPrefs, prefBudgetMax: 500_000 },
        { ...listing, status: "Pending" },
      ),
    ).toBe(false);
  });
});
