import { describe, expect, it } from "vitest";
import { buyerRequestSchema } from "../../src/schemas/buyer-request.schema";

const validRequest = {
  name: "Jane Buyer",
  email: "jane@example.com",
  minPrice: 300_000,
  maxPrice: 500_000,
  propertyTypes: ["Single Family"],
};

describe("buyerRequestSchema", () => {
  it("accepts bounded buyer criteria", () => {
    expect(buyerRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects a maximum price below the minimum price", () => {
    const result = buyerRequestSchema.safeParse({
      ...validRequest,
      minPrice: 600_000,
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized property-type arrays", () => {
    const result = buyerRequestSchema.safeParse({
      ...validRequest,
      propertyTypes: Array.from({ length: 21 }, (_, index) => `Type ${index}`),
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = buyerRequestSchema.safeParse({
      ...validRequest,
      admin: true,
    });

    expect(result.success).toBe(false);
  });
});
