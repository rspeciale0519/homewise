import { describe, expect, it } from "vitest";
import { toAbsoluteSiteUrl } from "./site-url";

describe("toAbsoluteSiteUrl", () => {
  it("leaves absolute urls unchanged", () => {
    expect(toAbsoluteSiteUrl("https://cdn.example.com/photo.jpg")).toBe(
      "https://cdn.example.com/photo.jpg",
    );
  });

  it("converts site-relative paths to absolute urls", () => {
    expect(toAbsoluteSiteUrl("/api/mls-photo?u=abc", "https://homewisefl.com/")).toBe(
      "https://homewisefl.com/api/mls-photo?u=abc",
    );
  });

  it("returns null for missing urls", () => {
    expect(toAbsoluteSiteUrl(null)).toBeNull();
    expect(toAbsoluteSiteUrl(undefined)).toBeNull();
  });
});
