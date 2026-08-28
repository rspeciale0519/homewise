import { describe, expect, it } from "vitest";
import { propertyFilterSchema } from "./property-filter.schema";

describe("propertyFilterSchema", () => {
  it("parses explicit false query values as false", () => {
    const result = propertyFilterSchema.parse({
      hasPool: "false",
      featured: "true",
    });

    expect(result.hasPool).toBe(false);
    expect(result.featured).toBe(true);
  });

  it("rejects invalid boolean query values", () => {
    expect(propertyFilterSchema.safeParse({ hasPool: "yes" }).success).toBe(false);
  });

  it("parses a bounded polygon with valid longitude and latitude", () => {
    const polygon = [[-81.4, 28.5], [-81.3, 28.5], [-81.35, 28.6]];
    const result = propertyFilterSchema.parse({ polygon: JSON.stringify(polygon) });

    expect(result.polygon).toEqual(polygon);
  });

  it("rejects malformed and out-of-range polygon coordinates", () => {
    expect(propertyFilterSchema.safeParse({ polygon: "not-json" }).success).toBe(false);
    expect(
      propertyFilterSchema.safeParse({
        polygon: JSON.stringify([[181, 28], [-81, 28], [-81, 29]]),
      }).success,
    ).toBe(false);
  });

  it("rejects polygons that exceed the point limit", () => {
    const polygon = Array.from({ length: 501 }, (_, index) => [
      -81 + index / 10_000,
      28,
    ]);

    expect(
      propertyFilterSchema.safeParse({ polygon: JSON.stringify(polygon) }).success,
    ).toBe(false);
  });

  it("rejects fractional pagination and invalid map bounds", () => {
    expect(propertyFilterSchema.safeParse({ page: "1.5" }).success).toBe(false);
    expect(propertyFilterSchema.safeParse({ north: "91" }).success).toBe(false);
  });
});
