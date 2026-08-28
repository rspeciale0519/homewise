import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  consumeMock,
  clientIpRateRuleMock,
  fetchIsochronePolygonMock,
  geocodeAddressMock,
} = vi.hoisted(() => ({
  consumeMock: vi.fn(),
  clientIpRateRuleMock: vi.fn(),
  fetchIsochronePolygonMock: vi.fn(),
  geocodeAddressMock: vi.fn(),
}));

vi.mock("@/lib/commute", () => ({
  fetchIsochronePolygon: fetchIsochronePolygonMock,
  geocodeAddress: geocodeAddressMock,
}));

vi.mock("@/lib/public-rate-limit", () => ({
  clientIpRateRule: clientIpRateRuleMock,
  publicMutationRateLimiter: { consume: consumeMock },
}));

import { GET } from "./route";

const originalVercel = process.env.VERCEL;

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/commute-polygon?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  clientIpRateRuleMock.mockReturnValue({
    key: "commute-polygon:ip:203.0.113.8",
    limit: 60,
  });
  consumeMock.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  geocodeAddressMock.mockResolvedValue({
    latitude: 28.5383,
    longitude: -81.3792,
    placeName: "Orlando, Florida",
  });
  fetchIsochronePolygonMock.mockResolvedValue({
    type: "Polygon",
    coordinates: [[[-81.4, 28.5]]],
  });
});

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe("GET /api/commute-polygon", () => {
  it("rejects invalid queries before rate limiting or external calls", async () => {
    const response = await GET(request("address=x&minutes=90"));

    expect(response.status).toBe(400);
    expect(consumeMock).not.toHaveBeenCalled();
    expect(geocodeAddressMock).not.toHaveBeenCalled();
  });

  it("returns 429 before external calls when the trusted address exceeds its limit", async () => {
    consumeMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 90 });

    const response = await GET(request("address=Orlando&minutes=20"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("90");
    expect(geocodeAddressMock).not.toHaveBeenCalled();
    expect(fetchIsochronePolygonMock).not.toHaveBeenCalled();
  });

  it("returns 503 before external calls when the shared limiter is unavailable", async () => {
    consumeMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 5,
      unavailable: true,
    });

    const response = await GET(request("address=Orlando&minutes=20"));

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(geocodeAddressMock).not.toHaveBeenCalled();
  });

  it("fails closed on Vercel when the trusted address is missing", async () => {
    process.env.VERCEL = "1";
    clientIpRateRuleMock.mockReturnValue(null);

    const response = await GET(request("address=Orlando&minutes=20"));

    expect(response.status).toBe(503);
    expect(consumeMock).not.toHaveBeenCalled();
    expect(geocodeAddressMock).not.toHaveBeenCalled();
  });

  it("returns the polygon after a permitted request", async () => {
    const response = await GET(request("address=Orlando&minutes=20"));

    expect(response.status).toBe(200);
    expect(clientIpRateRuleMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "commute-polygon",
      60,
    );
    expect(geocodeAddressMock).toHaveBeenCalledWith("Orlando");
    expect(fetchIsochronePolygonMock).toHaveBeenCalledWith(28.5383, -81.3792, 20);
  });
});
