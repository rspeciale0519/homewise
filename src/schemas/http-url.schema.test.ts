import { describe, expect, it } from "vitest";
import { httpUrlSchema } from "./http-url.schema";

describe("httpUrlSchema", () => {
  it.each([
    "https://example.com/document.pdf",
    "http://localhost:3100/document.pdf",
  ])("accepts %s", (value) => {
    expect(httpUrlSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    "not-a-url",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/document.pdf",
  ])("rejects %s", (value) => {
    expect(httpUrlSchema.safeParse(value).success).toBe(false);
  });
});
