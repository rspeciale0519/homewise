import { describe, it, expect } from "vitest";
import { homeEvaluationSchema } from "../../src/schemas/home-evaluation.schema";

describe("homeEvaluationSchema", () => {
  const valid = {
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "(407) 555-0199",
    streetAddress: "412 Interlachen Ave",
    city: "Winter Park",
    state: "FL",
    zip: "32789",
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2800,
    garageSpaces: 2,
    propertyType: "Single Family" as const,
    sellTimeline: "3-6 months" as const,
    listingStatus: "Not listed" as const,
    comments: "Looking for a market analysis.",
  };

  it("accepts valid full input", () => {
    const result = homeEvaluationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts minimal required fields", () => {
    const result = homeEvaluationSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "(407) 555-0199",
      streetAddress: "412 Interlachen Ave",
      city: "Winter Park",
      zip: "32789",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe("FL");
    }
  });

  it("defaults state to FL", () => {
    const { state: _state, ...noState } = valid;
    const result = homeEvaluationSchema.safeParse(noState);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe("FL");
    }
  });

  it("rejects invalid zip code", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, zip: "1234" });
    expect(result.success).toBe(false);
  });

  it("accepts 9-digit zip code", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, zip: "32789-1234" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid property type", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, propertyType: "Castle" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sell timeline", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, sellTimeline: "Yesterday" });
    expect(result.success).toBe(false);
  });

  it("coerces string bedrooms to number", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, bedrooms: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bedrooms).toBe(3);
    }
  });

  it("rejects sqft below 100", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, sqft: 50 });
    expect(result.success).toBe(false);
  });

  it("rejects short street address", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, streetAddress: "123" });
    expect(result.success).toBe(false);
  });

  it("allows empty comments", () => {
    const result = homeEvaluationSchema.safeParse({ ...valid, comments: "" });
    expect(result.success).toBe(true);
  });
});
