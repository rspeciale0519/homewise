import { describe, expect, it } from "vitest";
import {
  hasSignals,
  profileFromSignals,
  recommendListings,
  scoreListing,
} from "./recommendations";

const profile = {
  priceMin: 300_000,
  priceMax: 500_000,
  cities: ["orlando"],
  minBeds: 3,
  wantsPool: true,
  wantsWaterfront: false,
};

function candidate(overrides: Partial<Parameters<typeof scoreListing>[1]> = {}) {
  return {
    id: "c1",
    price: 400_000,
    city: "Orlando",
    beds: 4,
    hasPool: true,
    hasWaterfront: false,
    status: "Active",
    ...overrides,
  };
}

describe("scoreListing", () => {
  it("gives full marks to an on-profile listing", () => {
    expect(scoreListing(profile, candidate())).toBe(93);
  });

  it("zeroes non-active listings and penalizes off-profile prices", () => {
    expect(scoreListing(profile, candidate({ status: "Sold" }))).toBe(0);
    const farOver = scoreListing(profile, candidate({ price: 900_000 }));
    expect(farOver).toBeLessThan(scoreListing(profile, candidate({ price: 520_000 })));
  });
});

describe("recommendListings", () => {
  it("orders deterministically by score then price", () => {
    const results = recommendListings(
      profile,
      [
        candidate({ id: "expensive", price: 480_000 }),
        candidate({ id: "cheap", price: 320_000 }),
        candidate({ id: "wrong-city", city: "Tampa" }),
        candidate({ id: "sold", status: "Sold" }),
      ],
      3,
    );

    expect(results.map((r) => r.id)).toEqual(["cheap", "expensive", "wrong-city"]);
    expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score);
  });

  it("drops listings scoring under the floor", () => {
    const results = recommendListings(
      profile,
      [candidate({ id: "bad", city: "Miami", price: 2_000_000, beds: 1, hasPool: false })],
      3,
    );
    expect(results).toEqual([]);
  });
});

describe("profileFromSignals", () => {
  it("prefers explicit preferences and falls back to behavior", () => {
    const built = profileFromSignals({
      preferred: { priceMax: 600_000, cities: [] },
      behavior: [
        { price: 400_000, city: "Winter Garden", beds: 3, hasPool: true },
        { price: 500_000, city: "Orlando", beds: 4 },
      ],
    });

    expect(built.priceMax).toBe(600_000);
    expect(built.priceMin).toBe(320_000);
    expect(built.cities).toEqual(["winter garden", "orlando"]);
    expect(built.minBeds).toBe(3);
    expect(built.wantsPool).toBe(true);
    expect(hasSignals(built)).toBe(true);
  });
});
