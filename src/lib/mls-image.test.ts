import { afterEach, describe, expect, it } from "vitest";
import { parseAndVerify, proxyPhotoUrl, storageKeyFor } from "./mls-image";

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
