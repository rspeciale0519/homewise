import { afterEach, describe, expect, it } from "vitest";
import { canonicalMediaIdentity, parseAndVerify, proxyPhotoUrl, storageKeyFor } from "./mls-image";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("MLS image proxy helpers", () => {
  it("builds deterministic storage keys", () => {
    const sourceUrl = "https://media.example.test/photo.jpg";

    expect(storageKeyFor(sourceUrl)).toBe(storageKeyFor(sourceUrl));
    expect(storageKeyFor(sourceUrl)).toMatch(/^[a-f0-9]{64}\.jpg$/);
  });

  it("keeps storage keys stable when MLS Grid rotates signed media tokens", () => {
    const before =
      "https://media-demo.mlsgrid.com/token=AAA&expires=1781124658&id=abc/images/MFR733869680/061a16d2.jpeg";
    const after =
      "https://media-demo.mlsgrid.com/token=BBB&expires=1781129266&id=def/images/MFR733869680/061a16d2.jpeg";

    expect(canonicalMediaIdentity(before)).toBe("/images/MFR733869680/061a16d2.jpeg");
    expect(storageKeyFor(before)).toBe(storageKeyFor(after));
  });

  it("canonicalizes plain media URLs to host and path", () => {
    expect(canonicalMediaIdentity("https://media.example.test/photo.jpg?x=1")).toBe(
      "media.example.test/photo.jpg",
    );
    expect(canonicalMediaIdentity("not a url")).toBe("not a url");
  });

  it("builds signed proxy URLs", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";

    const url = proxyPhotoUrl("https://media.example.test/photo.jpg");

    expect(url).toMatch(/^\/api\/mls-photo\?u=[A-Za-z0-9_-]+&sig=[a-f0-9]{64}$/);
  });

  it("round-trips signed URLs", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";
    const sourceUrl = "https://media.example.test/photo.jpg?x=1";
    const proxyUrl = proxyPhotoUrl(sourceUrl);
    const params = new URLSearchParams(proxyUrl.split("?")[1]);

    expect(parseAndVerify(params)).toEqual({
      sourceUrl,
      storageKey: storageKeyFor(sourceUrl),
    });
  });

  it("rejects tampered signatures", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";
    const proxyUrl = proxyPhotoUrl("https://media.example.test/photo.jpg");
    const params = new URLSearchParams(proxyUrl.split("?")[1]);
    params.set("sig", "0".repeat(64));

    expect(parseAndVerify(params)).toBeNull();
  });
});
