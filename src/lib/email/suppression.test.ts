import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  propertyAlertFindFirstMock,
  savedSearchFindFirstMock,
  contactFindFirstMock,
  userProfileFindFirstMock,
} = vi.hoisted(() => ({
  propertyAlertFindFirstMock: vi.fn(),
  savedSearchFindFirstMock: vi.fn(),
  contactFindFirstMock: vi.fn(),
  userProfileFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    propertyAlert: { findFirst: propertyAlertFindFirstMock },
    savedSearch: { findFirst: savedSearchFindFirstMock },
    contact: { findFirst: contactFindFirstMock },
    userProfile: { findFirst: userProfileFindFirstMock },
  },
}));

import { canSendPreferenceEmail } from "./suppression";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canSendPreferenceEmail", () => {
  it("requires a verified active property alert for the selected recipient", async () => {
    propertyAlertFindFirstMock.mockResolvedValue({ id: "alert-1" });

    await expect(canSendPreferenceEmail({
      kind: "property_alert",
      id: "alert-1",
      recipientEmail: "alert@example.com",
    })).resolves.toBe(true);

    expect(propertyAlertFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "alert-1",
        email: "alert@example.com",
        active: true,
        verificationRequired: false,
      },
      select: { id: true },
    });
  });

  it("requires an enabled saved search for the selected recipient", async () => {
    savedSearchFindFirstMock.mockResolvedValue(null);

    await expect(canSendPreferenceEmail({
      kind: "saved_search",
      id: "search-1",
      recipientEmail: "search@example.com",
    })).resolves.toBe(false);

    expect(savedSearchFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "search-1",
        alertEnabled: true,
        user: { email: "search@example.com" },
      },
      select: { id: true },
    });
  });

  it("requires a contact without a marketing email opt-out", async () => {
    contactFindFirstMock.mockResolvedValue(null);

    await expect(canSendPreferenceEmail({
      kind: "contact",
      id: "contact-1",
      recipientEmail: "contact@example.com",
    })).resolves.toBe(false);

    expect(contactFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "contact-1",
        email: "contact@example.com",
        marketingEmailOptOutAt: null,
      },
      select: { id: true },
    });
  });

  it("requires enabled favorite-price alerts for the selected user", async () => {
    userProfileFindFirstMock.mockResolvedValue({ id: "user-1" });

    await expect(canSendPreferenceEmail({
      kind: "user",
      id: "user-1",
      recipientEmail: "user@example.com",
    })).resolves.toBe(true);

    expect(userProfileFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        email: "user@example.com",
        favoritePriceAlertsEnabled: true,
      },
      select: { id: true },
    });
  });

  it("fails closed when the preference query is unavailable", async () => {
    contactFindFirstMock.mockRejectedValue(new Error("database unavailable"));

    await expect(canSendPreferenceEmail({
      kind: "contact",
      id: "contact-1",
      recipientEmail: "contact@example.com",
    })).rejects.toThrow("database unavailable");
  });
});
