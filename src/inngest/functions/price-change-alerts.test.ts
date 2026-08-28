import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listingFindFirstMock,
  favoriteFindManyMock,
  propertyAlertFindManyMock,
  sendEmailMock,
  createUnsubscribeTokenMock,
  canSendPreferenceEmailMock,
} = vi.hoisted(() => ({
  listingFindFirstMock: vi.fn(),
  favoriteFindManyMock: vi.fn(),
  propertyAlertFindManyMock: vi.fn(),
  sendEmailMock: vi.fn(),
  createUnsubscribeTokenMock: vi.fn(),
  canSendPreferenceEmailMock: vi.fn(),
}));

vi.mock("../client", () => ({
  inngest: {
    createFunction: (_config: unknown, _trigger: unknown, handler: unknown) => ({ handler }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findFirst: listingFindFirstMock },
    favoriteProperty: { findMany: favoriteFindManyMock },
    propertyAlert: { findMany: propertyAlertFindManyMock },
  },
}));

vi.mock("@/lib/mls-alert-suppression", () => ({
  areMlsBackfillAlertsSuppressed: () => false,
}));

vi.mock("@/lib/mls-visibility", () => ({
  withIdx: (where: unknown) => where,
}));

vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return { ...actual, sendEmail: sendEmailMock };
});

vi.mock("@/lib/email/templates", () => ({
  priceChangeAlertEmail: () => ({
    subject: "Price change",
    html: '<a href="{{unsubscribe_url}}">Unsubscribe</a>',
  }),
}));

vi.mock("@/lib/email/action-token", () => ({
  createUnsubscribeToken: createUnsubscribeTokenMock,
}));

vi.mock("@/lib/email/suppression", () => ({
  canSendPreferenceEmail: canSendPreferenceEmailMock,
}));

import { priceChangeAlert } from "./price-change-alerts";

type Handler = (input: {
  event: {
    data: {
      mlsId: string;
      oldPrice: number;
      newPrice: number;
      address: string;
      city: string;
    };
  };
  step: { run: (id: string, callback: () => Promise<unknown>) => Promise<unknown> };
}) => Promise<unknown>;

const handler = (priceChangeAlert as unknown as { handler: Handler }).handler;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SITE_URL = "https://homewisefl.com";
  listingFindFirstMock.mockResolvedValue({ id: "listing-1" });
  favoriteFindManyMock.mockResolvedValue([
    {
      id: "favorite-1",
      user: { id: "user-1", email: "user@example.com", firstName: "User" },
    },
  ]);
  propertyAlertFindManyMock.mockResolvedValue([
    {
      id: "alert-1",
      email: "alert@example.com",
      name: "Alert",
      user: null,
    },
  ]);
  createUnsubscribeTokenMock.mockImplementation(
    (target: { kind: string; id: string }) => `signed/${target.kind}/${target.id}`,
  );
  sendEmailMock.mockResolvedValue({ id: "message-1", error: null });
  canSendPreferenceEmailMock.mockResolvedValue(true);
});

describe("price change unsubscribe links", () => {
  it("filters favorite preferences and signs both unsubscribe target kinds", async () => {
    const result = await handler({
      event: {
        data: {
          mlsId: "MFR1",
          oldPrice: 500_000,
          newPrice: 475_000,
          address: "1 Main St",
          city: "Orlando",
        },
      },
      step: {
        run: vi.fn((_id: string, callback: () => Promise<unknown>) => callback()),
      },
    });

    expect(favoriteFindManyMock).toHaveBeenCalledWith({
      where: {
        propertyId: "listing-1",
        user: { favoritePriceAlertsEnabled: true },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
      },
    });
    expect(createUnsubscribeTokenMock).toHaveBeenNthCalledWith(
      1,
      { kind: "user", id: "user-1" },
      "user@example.com",
    );
    expect(createUnsubscribeTokenMock).toHaveBeenNthCalledWith(
      2,
      { kind: "property_alert", id: "alert-1" },
      "alert@example.com",
    );
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock.mock.calls[0]?.[0].html).toContain(
      "https://homewisefl.com/unsubscribe?token=signed%2Fuser%2Fuser-1",
    );
    expect(sendEmailMock.mock.calls[1]?.[0].html).toContain(
      "https://homewisefl.com/unsubscribe?token=signed%2Fproperty_alert%2Falert-1",
    );
    expect(result).toEqual({ sent: 2 });
  });

  it("skips a favorite email disabled after recipient selection", async () => {
    canSendPreferenceEmailMock.mockImplementation(
      (target: { kind: string }) => Promise.resolve(target.kind !== "user"),
    );
    propertyAlertFindManyMock.mockResolvedValue([
      {
        id: "alert-1",
        email: "user@example.com",
        name: "Alert",
        user: null,
      },
    ]);

    const result = await handler({
      event: {
        data: {
          mlsId: "MFR1",
          oldPrice: 500_000,
          newPrice: 475_000,
          address: "1 Main St",
          city: "Orlando",
        },
      },
      step: { run: vi.fn((_id: string, callback: () => Promise<unknown>) => callback()) },
    });

    expect(canSendPreferenceEmailMock).toHaveBeenCalledWith({
      kind: "user",
      id: "user-1",
      recipientEmail: "user@example.com",
    });
    expect(sendEmailMock).toHaveBeenCalledOnce();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "user@example.com",
    }));
    expect(result).toEqual({ sent: 1 });
  });

  it("skips a property alert disabled after recipient selection", async () => {
    canSendPreferenceEmailMock.mockImplementation(
      (target: { kind: string }) => Promise.resolve(target.kind !== "property_alert"),
    );

    const result = await handler({
      event: {
        data: {
          mlsId: "MFR1",
          oldPrice: 500_000,
          newPrice: 475_000,
          address: "1 Main St",
          city: "Orlando",
        },
      },
      step: { run: vi.fn((_id: string, callback: () => Promise<unknown>) => callback()) },
    });

    expect(canSendPreferenceEmailMock).toHaveBeenCalledWith({
      kind: "property_alert",
      id: "alert-1",
      recipientEmail: "alert@example.com",
    });
    expect(sendEmailMock).toHaveBeenCalledOnce();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "user@example.com",
    }));
    expect(result).toEqual({ sent: 1 });
  });
});
