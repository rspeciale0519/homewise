import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFunctionMock,
  syncStateFindUniqueMock,
  syncStateUpsertMock,
  syncStateUpdateMock,
  buildPropertyUrlMock,
  fetchPageMock,
  syncOpenHousesMock,
} = vi.hoisted(() => ({
  createFunctionMock: vi.fn(),
  syncStateFindUniqueMock: vi.fn(),
  syncStateUpsertMock: vi.fn(),
  syncStateUpdateMock: vi.fn(),
  buildPropertyUrlMock: vi.fn(),
  fetchPageMock: vi.fn(),
  syncOpenHousesMock: vi.fn(),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: (config: unknown, triggers: unknown, handler: unknown) => {
      createFunctionMock(config, triggers, handler);
      return { handler };
    },
    send: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    syncState: {
      findUnique: syncStateFindUniqueMock,
      upsert: syncStateUpsertMock,
      update: syncStateUpdateMock,
    },
  },
}));

vi.mock("@/lib/mls-grid", () => ({
  hasCredentials: () => true,
  buildPropertyUrl: buildPropertyUrlMock,
  fetchPage: fetchPageMock,
}));

vi.mock("./mls-openhouse", () => ({
  syncOpenHouses: syncOpenHousesMock,
}));

vi.mock("./mls-sync.mapper", () => ({
  detectPriceChange: vi.fn(),
  mapResoToListingData: vi.fn(),
  priceHistoryEntriesFor: vi.fn(),
}));

vi.mock("@/lib/mls-image", () => ({ storageKeyFor: vi.fn() }));
vi.mock("@/lib/listing-tags", () => ({ aiStyleTags: vi.fn() }));
vi.mock("@/lib/mls-agent-id", () => ({ normalizeMlsAgentId: vi.fn() }));
vi.mock("@/lib/mls-visibility", () => ({ withIdx: (where: unknown) => where }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { mlsSync } from "./mls-sync";

type SyncHandler = (input: {
  event: { name: string; data: unknown };
  step: {
    run: (id: string, handler: () => Promise<unknown>) => Promise<unknown>;
    sendEvent: (id: string, event: unknown) => Promise<unknown>;
  };
}) => Promise<unknown>;

const handler = (mlsSync as unknown as { handler: SyncHandler }).handler;
const completedCursor = "2026-08-01T00:00:00.000Z";

function state(status: string, updatedAt = new Date()) {
  return {
    provider: "stellar",
    status,
    cursor: completedCursor,
    updatedAt,
    metadata: null,
  };
}

function step(sendEvent = vi.fn().mockResolvedValue(undefined)) {
  return {
    run: vi.fn((_id: string, callback: () => Promise<unknown>) => callback()),
    sendEvent,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  syncStateFindUniqueMock.mockResolvedValue(state("idle"));
  syncStateUpsertMock.mockResolvedValue(state("syncing"));
  syncStateUpdateMock.mockResolvedValue(state("syncing"));
  buildPropertyUrlMock.mockReturnValue("initial-page");
  syncOpenHousesMock.mockResolvedValue({ processed: 0 });
});

describe("MLS continuation recovery", () => {
  it("keeps the completed cursor when continuation dispatch fails", async () => {
    for (let index = 0; index < 10; index++) {
      fetchPageMock.mockResolvedValueOnce({
        value: [],
        "@odata.nextLink": `next-page-${index + 1}`,
      });
    }
    const sendEvent = vi.fn().mockRejectedValue(new Error("continuation unavailable"));

    await expect(handler({
      event: { name: "mls-sync", data: {} },
      step: step(sendEvent),
    })).rejects.toThrow("continuation unavailable");

    const progressUpdates = syncStateUpdateMock.mock.calls
      .map(([input]) => input.data)
      .filter((data) => "totalSynced" in data);
    expect(progressUpdates).toHaveLength(10);
    expect(progressUpdates.every((data) => !("cursor" in data))).toBe(true);
    expect(sendEvent).toHaveBeenCalledWith(
      "continue-property-sync",
      expect.objectContaining({
        data: expect.objectContaining({ cursor: completedCursor }),
      }),
    );

    vi.clearAllMocks();
    syncStateFindUniqueMock.mockResolvedValue(state("error"));
    syncStateUpsertMock.mockResolvedValue(state("syncing"));
    syncStateUpdateMock.mockResolvedValue(state("syncing"));
    buildPropertyUrlMock.mockReturnValue("restarted-page");
    fetchPageMock.mockResolvedValue({ value: [] });
    syncOpenHousesMock.mockResolvedValue({ processed: 0 });

    await expect(handler({
      event: { name: "inngest/scheduled.timer", data: {} },
      step: step(),
    })).resolves.toMatchObject({ status: "success", cursor: completedCursor });
    expect(buildPropertyUrlMock).toHaveBeenCalledWith({
      modifiedAfter: completedCursor,
      initialImport: false,
      top: 200,
    });
  });

  it("restarts a stale syncing run from the completed cursor", async () => {
    syncStateFindUniqueMock.mockResolvedValue(
      state("syncing", new Date(Date.now() - 31 * 60 * 1000)),
    );
    syncStateUpsertMock.mockResolvedValue(state("syncing"));
    fetchPageMock.mockResolvedValue({ value: [] });

    await expect(handler({
      event: { name: "inngest/scheduled.timer", data: {} },
      step: step(),
    })).resolves.toMatchObject({ status: "success" });
    expect(buildPropertyUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({ modifiedAfter: completedCursor }),
    );
  });
});
