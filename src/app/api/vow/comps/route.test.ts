import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock, isVowRegisteredMock, findManyMock, logMlsAccessMock } = vi.hoisted(
  () => ({
    getUserMock: vi.fn(),
    isVowRegisteredMock: vi.fn(),
    findManyMock: vi.fn(),
    logMlsAccessMock: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("@/lib/vow", () => ({
  isVowRegistered: isVowRegisteredMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { listing: { findMany: findManyMock } },
}));

vi.mock("@/lib/mls-access-log", () => ({
  logMlsAccess: logMlsAccessMock,
}));

import { GET } from "./route";

const originalVercel = process.env.VERCEL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VERCEL = "1";
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  isVowRegisteredMock.mockResolvedValue(true);
  findManyMock.mockResolvedValue([]);
});

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe("GET /api/vow/comps", () => {
  it("rejects unbounded or malformed search values", async () => {
    const longCity = await GET(
      new NextRequest(`https://homewisefl.com/api/vow/comps?city=${"a".repeat(101)}`),
    );
    const malformedZip = await GET(
      new NextRequest("https://homewisefl.com/api/vow/comps?zip=../../etc/passwd"),
    );

    expect(longCity.status).toBe(400);
    expect(malformedZip.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("logs only the trusted Vercel client address", async () => {
    const response = await GET(
      new NextRequest("https://homewisefl.com/api/vow/comps?city=Orlando&zip=32801", {
        headers: {
          "x-forwarded-for": "10.0.0.1",
          "x-vercel-forwarded-for": "203.0.113.8, 76.76.21.21",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25 }),
    );
    expect(logMlsAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "sold-comps Orlando 32801 -> 0",
        ipAddress: "203.0.113.8",
      }),
    );
  });
});
