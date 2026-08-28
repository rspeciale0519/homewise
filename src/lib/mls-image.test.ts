import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}));

import {
  allowedMlsMediaHosts,
  canonicalMediaIdentity,
  isPublicIpAddress,
  normalizeMlsMediaUrl,
  parseAndVerify,
  proxyPhotoUrl,
  resolvePublicMlsMediaUrl,
  storageKeyFor,
} from "./mls-image";

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MLS_GRID_BASE_URL = "https://api.mlsgrid.com/v2";
  delete process.env.MLS_MEDIA_ALLOWED_HOSTS;
  lookupMock.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
});

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

  it("does not derive canonical image paths from query text", () => {
    expect(
      canonicalMediaIdentity(
        "https://media.mlsgrid.com/photo.jpg?redirect=/images/other/photo.jpg",
      ),
    ).toBe("media.mlsgrid.com/photo.jpg");
  });

  it("builds signed proxy URLs", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";

    const url = proxyPhotoUrl("https://media.mlsgrid.com/photo.jpg");

    expect(url).toMatch(/^\/api\/mls-photo\?u=[A-Za-z0-9_-]+&sig=[a-f0-9]{64}$/);
  });

  it("round-trips signed URLs", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";
    const sourceUrl = "https://media.mlsgrid.com/photo.jpg?x=1";
    const proxyUrl = proxyPhotoUrl(sourceUrl);
    const params = new URLSearchParams(proxyUrl.split("?")[1]);

    expect(parseAndVerify(params)).toEqual({
      sourceUrl,
      storageKey: storageKeyFor(sourceUrl),
    });
  });

  it("rejects tampered signatures", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";
    const proxyUrl = proxyPhotoUrl("https://media.mlsgrid.com/photo.jpg");
    const params = new URLSearchParams(proxyUrl.split("?")[1]);
    params.set("sig", "0".repeat(64));

    expect(parseAndVerify(params)).toBeNull();
  });

  it("derives the media host from the configured MLS Grid provider", () => {
    process.env.MLS_GRID_BASE_URL = "https://api-demo.mlsgrid.com/v2";

    expect(allowedMlsMediaHosts()).toEqual(
      new Set(["photos.stellarmls.com", "media-demo.mlsgrid.com"]),
    );
    expect(normalizeMlsMediaUrl("https://media-demo.mlsgrid.com/images/a.jpg")).toBe(
      "https://media-demo.mlsgrid.com/images/a.jpg",
    );
  });

  it("uses an exact configured host allowlist", () => {
    process.env.MLS_MEDIA_ALLOWED_HOSTS = "cdn.stellarmls.com";

    expect(normalizeMlsMediaUrl("https://cdn.stellarmls.com/photo.jpg")).toBe(
      "https://cdn.stellarmls.com/photo.jpg",
    );
    expect(normalizeMlsMediaUrl("https://media.mlsgrid.com/photo.jpg")).toBeNull();
  });

  it.each([
    "http://media.mlsgrid.com/photo.jpg",
    "https://media.mlsgrid.com.evil.test/photo.jpg",
    "https://media.mlsgrid.com@evil.test/photo.jpg",
    "https://127.0.0.1/photo.jpg",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/photo.jpg",
  ])("rejects an unsafe media URL: %s", (sourceUrl) => {
    expect(normalizeMlsMediaUrl(sourceUrl)).toBeNull();
  });

  it("does not sign an unapproved source URL", () => {
    process.env.MLS_IMAGE_SIGNING_SECRET = "secret";

    expect(() => proxyPhotoUrl("https://evil.test/photo.jpg")).toThrow(
      "MLS media URL is not approved",
    );
  });

  it.each(["10.0.0.1", "127.0.0.1", "169.254.1.1", "172.16.0.1", "192.168.1.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "blocks private or local address %s",
    (address) => {
      expect(isPublicIpAddress(address)).toBe(false);
    },
  );

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isPublicIpAddress(address)).toBe(true);
    },
  );

  it("rejects an approved hostname when DNS returns a private target", async () => {
    lookupMock.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);

    await expect(
      resolvePublicMlsMediaUrl("https://media.mlsgrid.com/photo.jpg"),
    ).resolves.toBeNull();
  });

  it("accepts an approved hostname only when all DNS targets are public", async () => {
    lookupMock.mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ]);

    await expect(
      resolvePublicMlsMediaUrl("https://media.mlsgrid.com/photo.jpg"),
    ).resolves.toBe("https://media.mlsgrid.com/photo.jpg");
  });
});
