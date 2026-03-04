import { describe, it, expect } from "vitest";
import { z } from "zod";

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

describe("Tag createTagSchema", () => {
  it("accepts valid tag with name and color", () => {
    const result = createTagSchema.safeParse({ name: "Hot Lead", color: "#ef4444" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Hot Lead");
      expect(result.data.color).toBe("#ef4444");
    }
  });

  it("accepts valid tag with name only", () => {
    const result = createTagSchema.safeParse({ name: "VIP" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createTagSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 50 characters", () => {
    const result = createTagSchema.safeParse({ name: "A".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("accepts name at exactly 50 characters", () => {
    const result = createTagSchema.safeParse({ name: "A".repeat(50) });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex color (missing #)", () => {
    const result = createTagSchema.safeParse({ name: "Tag", color: "ef4444" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color (3-digit)", () => {
    const result = createTagSchema.safeParse({ name: "Tag", color: "#f00" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color (non-hex chars)", () => {
    const result = createTagSchema.safeParse({ name: "Tag", color: "#gggggg" });
    expect(result.success).toBe(false);
  });

  it("accepts uppercase hex color", () => {
    const result = createTagSchema.safeParse({ name: "Tag", color: "#AABBCC" });
    expect(result.success).toBe(true);
  });

  it("accepts mixed case hex color", () => {
    const result = createTagSchema.safeParse({ name: "Tag", color: "#aAbBcC" });
    expect(result.success).toBe(true);
  });
});
