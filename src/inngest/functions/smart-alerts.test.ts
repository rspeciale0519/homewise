import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  savedSearchFindManyMock,
  listingFindManyMock,
  sendEmailMock,
  canSendPreferenceEmailMock,
  createUnsubscribeTokenMock,
} = vi.hoisted(() => ({
  savedSearchFindManyMock: vi.fn(),
  listingFindManyMock: vi.fn(),
  sendEmailMock: vi.fn(),
  canSendPreferenceEmailMock: vi.fn(),
  createUnsubscribeTokenMock: vi.fn(),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: (_config: unknown, _trigger: unknown, handler: unknown) => ({ handler }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedSearch: { findMany: savedSearchFindManyMock },
    listing: { findMany: listingFindManyMock },
  },
}));

vi.mock("@/lib/mls-alert-suppression", () => ({
  areMlsBackfillAlertsSuppressed: () => false,
}));

vi.mock("@/lib/mls-visibility", () => ({
  withIdx: (where: unknown) => where,
}));

vi.mock("@/lib/ai/embeddings", () => ({
  semanticSearch: vi.fn(),
}));

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://homewisefl.com",
  toAbsoluteSiteUrl: () => null,
}));

vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return { ...actual, sendEmail: sendEmailMock };
});

vi.mock("@/lib/email/action-token", () => ({
  createUnsubscribeToken: createUnsubscribeTokenMock,
}));

vi.mock("@/lib/email/suppression", () => ({
  canSendPreferenceEmail: canSendPreferenceEmailMock,
}));

import { smartListingAlerts } from "./smart-alerts";

type Handler = (input: {
  step: { run: (id: string, callback: () => unknown) => Promise<unknown> };
}) => Promise<unknown>;

const handler = (smartListingAlerts as unknown as { handler: Handler }).handler;

beforeEach(() => {
  vi.clearAllMocks();
  savedSearchFindManyMock.mockResolvedValue([
    {
      id: "search-1",
      filters: {},
      matchingMode: "strict",
      rigidity: 100,
      user: {
        id: "user-1",
        email: "search@example.com",
        firstName: "Search",
      },
    },
  ]);
  listingFindManyMock.mockResolvedValue([
    {
      id: "listing-1",
      mlsId: "MFR1",
      address: "1 Main St",
      city: "Orlando",
      price: 450_000,
      beds: 3,
      baths: 2,
      sqft: 1_800,
      imageUrl: null,
    },
  ]);
  createUnsubscribeTokenMock.mockReturnValue("signed-token");
  sendEmailMock.mockResolvedValue({ id: "message-1", error: null });
});

describe("smart alert send-time suppression", () => {
  it("skips a saved search disabled after recipient selection", async () => {
    canSendPreferenceEmailMock.mockResolvedValue(false);

    const result = await handler({
      step: {
        run: vi.fn(async (_id: string, callback: () => unknown) => callback()),
      },
    });

    expect(savedSearchFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { alertEnabled: true },
    }));
    expect(canSendPreferenceEmailMock).toHaveBeenCalledWith({
      kind: "saved_search",
      id: "search-1",
      recipientEmail: "search@example.com",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({ searches: 1, sent: 0 });
  });
});
