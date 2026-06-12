const MAPBOX_BASE = "https://api.mapbox.com";
const MAX_RING_POINTS = 60;

function mapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

export type GeocodeResult = { latitude: number; longitude: number; placeName: string };

type GeocodeResponse = {
  features?: Array<{ center?: [number, number]; place_name?: string }>;
};

type IsochroneResponse = {
  features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>;
};

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const token = mapboxToken();
  if (!token) return null;

  const url = `${MAPBOX_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&country=US`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as GeocodeResponse;
  const feature = data.features?.[0];
  if (!feature?.center) return null;

  const [longitude, latitude] = feature.center;
  return { latitude, longitude, placeName: feature.place_name ?? query };
}

export async function fetchIsochronePolygon(
  latitude: number,
  longitude: number,
  minutes: number,
): Promise<[number, number][] | null> {
  const token = mapboxToken();
  if (!token) return null;

  const url = `${MAPBOX_BASE}/isochrone/v1/mapbox/driving/${longitude},${latitude}?contours_minutes=${minutes}&polygons=true&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as IsochroneResponse;
  return isochroneToPolygon(data);
}

export function isochroneToPolygon(data: IsochroneResponse): [number, number][] | null {
  const geometry = data.features?.[0]?.geometry;
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const ring = (geometry.coordinates as unknown[])[0];
  if (!Array.isArray(ring)) return null;

  const points = ring
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number",
    )
    .map(([lng, lat]): [number, number] => [round5(lng), round5(lat)]);

  if (points.length < 3) return null;
  return simplifyRing(points, MAX_RING_POINTS);
}

export function simplifyRing(ring: [number, number][], maxPoints: number): [number, number][] {
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const simplified = ring.filter((_, index) => index % step === 0);
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    simplified.push(first);
  }
  return simplified;
}

function round5(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}
