import { describe, it, expect } from "vitest";
import { contactSchema } from "../../src/schemas/contact.schema";

describe("contactSchema", () => {
  const valid = {
    name: "John Doe",
    email: "john@example.com",
    phone: "(407) 555-0101",
    message: "I'm interested in buying a home in Winter Park.",
  };

  it("accepts valid input", () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("trims and lowercases email", () => {
    const result = contactSchema.safeParse({ ...valid, email: "  John@Example.COM  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("allows empty phone", () => {
    const result = contactSchema.safeParse({ ...valid, phone: "" });
    expect(result.success).toBe(true);
  });

  it("allows missing phone", () => {
    const { phone: _, ...noPhone } = valid;
    const result = contactSchema.safeParse(noPhone);
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const result = contactSchema.safeParse({ ...valid, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = contactSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects short message", () => {
    const result = contactSchema.safeParse({ ...valid, message: "Hi" });
    expect(result.success).toBe(false);
  });

  it("rejects message over 2000 chars", () => {
    const result = contactSchema.safeParse({ ...valid, message: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone format", () => {
    const result = contactSchema.safeParse({ ...valid, phone: "abc" });
    expect(result.success).toBe(false);
  });
});
