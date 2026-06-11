import { afterEach, describe, expect, it } from "vitest";
import { storageKeyFor } from "@/lib/mls-image";
import type { ResoProperty } from "@/types/reso";
import { detectPriceChange, mapResoToListingData } from "./mls-sync";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function resoListing(overrides: Partial<ResoProperty> = {}): ResoProperty {
  return {
    ListingKey: "LK-123",
    ListingId: "STELLAR-456",
    StandardStatus: "Closed",
    ListPrice: 625_000,
    ClosePrice: 618_000,
    OriginalListPrice: 650_000,
    UnparsedAddress: "123 Palm Ave",
    City: "Tampa",
    StateOrProvince: "FL",
    PostalCode: "33602",
    BedroomsTotal: 4,
    BathroomsFull: 3,
    BathroomsHalf: 1,
    BathroomsTotalDecimal: 3.5,
    LivingArea: 2550,
    PropertyType: "Residential",
    PropertySubType: "Single Family Residence",
    Media: [
      { MediaURL: "https://media.example.test/two.jpg", Order: 2 },
      { MediaURL: "https://media.example.test/one.jpg", Order: 1 },
    ],
    ElementarySchoolDistrict: "Elementary District",
    MiddleOrJuniorSchoolDistrict: "Middle District",
    HighSchoolDistrict: "High District",
    ListOfficeMlsId: "HW-1",
    ListOfficeName: "HomeWise Realty",
    ListAgentFullName: "Avery Agent",
    ListAgentMlsId: "agent-9",
    MlgCanUse: ["IDX", "VOW"],
    ModificationTimestamp: "2026-06-08T15:30:00Z",
    PhotosChangeTimestamp: "2026-06-08T15:20:00Z",
    ...overrides,
  };
}

describe("MLS sync mapping", () => {
  it("maps RESO listing fields with ListingKey identity and IDX compliance data", () => {
    process.env.HOMEWISE_OFFICE_MLS_ID = "HW-1,OTHER";
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";

    const mapped = mapResoToListingData(resoListing());

    expect(mapped.mlsId).toBe("LK-123");
    expect(mapped.listingId).toBe("STELLAR-456");
    expect(mapped.status).toBe("Sold");
    expect(mapped.mlgCanUse).toEqual(["IDX", "VOW"]);
    expect(mapped.photoSources).toEqual([
      "https://media.example.test/one.jpg",
      "https://media.example.test/two.jpg",
    ]);
    expect(mapped.photos[0]).toContain("/api/mls-photo?");
    expect(mapped.imageUrl).toBe(mapped.photos[0]);
    expect(mapped.featured).toBe(true);
    expect(mapped.elementarySchoolDistrict).toBe("Elementary District");
    expect(mapped.middleSchoolDistrict).toBe("Middle District");
    expect(mapped.highSchoolDistrict).toBe("High District");
    expect(mapped.schoolDistrict).toBe("Elementary District");
    expect(mapped.mlsLastModified).toEqual(new Date("2026-06-08T15:30:00Z"));
    const firstPhotoSource = mapped.photoSources[0];
    if (!firstPhotoSource) throw new Error("Expected at least one photo source");
    expect(storageKeyFor(firstPhotoSource)).toMatch(/^[a-f0-9]{64}\.jpg$/);
  });

  it("does not mark non-HomeWise offices as featured", () => {
    process.env.HOMEWISE_OFFICE_MLS_ID = "HW-2";
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";

    expect(mapResoToListingData(resoListing()).featured).toBe(false);
  });

  it("maps land listings without bed/bath/area fields using zero fallbacks", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";

    const mapped = mapResoToListingData(
      resoListing({
        PropertyType: "Land",
        BedroomsTotal: undefined,
        BathroomsFull: undefined,
        BathroomsHalf: undefined,
        BathroomsTotalDecimal: undefined,
        LivingArea: undefined,
      }),
    );

    expect(mapped.beds).toBe(0);
    expect(mapped.bathsFull).toBe(0);
    expect(mapped.bathsHalf).toBe(0);
    expect(mapped.baths).toBe(0);
    expect(mapped.sqft).toBe(0);
  });

  it("derives total baths from full and half counts when decimal is absent", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";

    const mapped = mapResoToListingData(
      resoListing({ BathroomsTotalDecimal: undefined, BathroomsFull: 4, BathroomsHalf: 1 }),
    );

    expect(mapped.baths).toBe(4.5);
  });

  it("detects price changes", () => {
    expect(detectPriceChange({ price: 600_000 }, resoListing())).toBe(true);
    expect(detectPriceChange({ price: 625_000 }, resoListing())).toBe(false);
    expect(detectPriceChange(null, resoListing())).toBe(false);
  });
});
