import { afterEach, describe, expect, it, vi } from "vitest";
import { aiStyleTags, deriveListingTags } from "./listing-tags";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("deriveListingTags", () => {
  it("derives rule-based tags from listing facts", () => {
    expect(
      deriveListingTags({
        hasPool: true,
        hasWaterfront: true,
        isNewConstruction: false,
        hasGatedCommunity: true,
        yearBuilt: 2022,
        communityFeatures: ["Golf Carts OK", "Senior Community - 55+", "Boat Dock"],
      }),
    ).toEqual(["55-plus", "boating", "gated", "golf", "newer-build", "pool", "waterfront"]);
  });

  it("buckets older homes and land", () => {
    expect(deriveListingTags({ yearBuilt: 1965, propertyType: "Land" })).toEqual([
      "established",
      "land",
    ]);
    expect(deriveListingTags({})).toEqual([]);
  });
});

describe("aiStyleTags", () => {
  it("never calls OpenAI when the key is absent", async () => {
    delete process.env.OPENAI_API_KEY;
    const fetchSpy = vi.spyOn(global, "fetch");

    const tags = await aiStyleTags({ description: "A lovely modern home", propertyType: "Residential" });

    expect(tags).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
