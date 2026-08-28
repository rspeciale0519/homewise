import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, upsertMock, fetchMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    walkScoreCache: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

import { getWalkScore } from "./walk-score";

describe("getWalkScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WALK_SCORE_API_KEY", "walk-score-test-key");
    vi.stubGlobal("fetch", fetchMock);
    findUniqueMock.mockResolvedValue(null);
    upsertMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stores only fields that exist in the Prisma cache model", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          walkscore: 82,
          description: "Very Walkable",
          transit: { score: 41, description: "Some Transit" },
          bike: { score: 73, description: "Very Bikeable" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      getWalkScore("123 Main Street, Orlando, FL", 28.54, -81.38),
    ).resolves.toMatchObject({
      walkScore: 82,
      walkScoreDescription: "Very Walkable",
      transitScore: 41,
      bikeScore: 73,
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          walkScore: 82,
          transitScore: 41,
          bikeScore: 73,
          description: "Very Walkable",
        }),
        create: expect.objectContaining({
          walkScore: 82,
          transitScore: 41,
          bikeScore: 73,
          description: "Very Walkable",
        }),
      }),
    );
    const data = upsertMock.mock.calls[0]?.[0];
    expect(data?.update).not.toHaveProperty("walkScoreDescription");
    expect(data?.create).not.toHaveProperty("transitScoreDescription");
  });

  it("rejects invalid third-party scores without writing the cache", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ walkscore: 101 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      getWalkScore("123 Main Street, Orlando, FL", 28.54, -81.38),
    ).resolves.toBeNull();
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
