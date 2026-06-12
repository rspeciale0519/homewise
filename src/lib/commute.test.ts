import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchIsochronePolygon,
  geocodeAddress,
  isochroneToPolygon,
  simplifyRing,
} from "./commute";

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("isochroneToPolygon", () => {
  it("extracts and rounds the outer ring", () => {
    const polygon = isochroneToPolygon({
      features: [
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-81.123456789, 28.512345678],
                [-81.2, 28.5],
                [-81.15, 28.6],
                [-81.123456789, 28.512345678],
              ],
            ],
          },
        },
      ],
    });

    expect(polygon).toEqual([
      [-81.12346, 28.51235],
      [-81.2, 28.5],
      [-81.15, 28.6],
      [-81.12346, 28.51235],
    ]);
  });

  it("returns null for missing or non-polygon geometry", () => {
    expect(isochroneToPolygon({})).toBeNull();
    expect(isochroneToPolygon({ features: [{ geometry: { type: "LineString", coordinates: [] } }] })).toBeNull();
  });
});

describe("simplifyRing", () => {
  it("downsamples long rings and keeps them closed", () => {
    const ring: [number, number][] = Array.from({ length: 300 }, (_, i) => [i, i * 2]);
    const simplified = simplifyRing(ring, 60);

    expect(simplified.length).toBeLessThanOrEqual(61);
    expect(simplified[0]).toEqual(simplified[simplified.length - 1]);
  });

  it("returns short rings untouched", () => {
    const ring: [number, number][] = [[0, 0], [1, 0], [1, 1]];
    expect(simplifyRing(ring, 60)).toEqual(ring);
  });
});

describe("mapbox calls", () => {
  it("geocodes via mapbox and returns the first feature", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "tok";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ center: [-81.3, 28.5], place_name: "Orlando, FL" }] }),
    }) as unknown as typeof fetch;

    const result = await geocodeAddress("Orlando");

    expect(result).toEqual({ latitude: 28.5, longitude: -81.3, placeName: "Orlando, FL" });
  });

  it("returns null without a token or on upstream failure", async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    expect(await geocodeAddress("Orlando")).toBeNull();

    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "tok";
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    expect(await fetchIsochronePolygon(28.5, -81.3, 20)).toBeNull();
  });
});
