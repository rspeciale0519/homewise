import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, create, updateMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { propertyAlert: { findUnique, create, updateMany } },
}));

import {
  prepareAnonymousPropertyAlert,
  releasePropertyAlertEmailCooldown,
} from "./property-alert-signup";

const NOW = new Date("2026-08-27T12:00:00.000Z");
const input = {
  email: "buyer@example.com",
  name: "Buyer",
  cities: ["Orlando"],
  minPrice: 250_000,
  maxPrice: 500_000,
  beds: 3,
};

describe("anonymous property alert preparation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new alert in a pending state", async () => {
    findUnique.mockResolvedValueOnce(null);
    create.mockResolvedValue({
      id: "alert-1",
      email: input.email,
      name: input.name,
      verificationVersion: 1,
      verificationSentAt: NOW,
    });

    await expect(prepareAnonymousPropertyAlert(input, NOW)).resolves.toMatchObject({
      kind: "confirmation",
      alertId: "alert-1",
      verificationVersion: 1,
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        active: false,
        verificationRequired: true,
        verificationVersion: 1,
      }),
    }));
  });

  it("uses an atomic database cooldown for pending resend requests", async () => {
    findUnique.mockResolvedValue({
      id: "alert-1",
      email: input.email,
      name: input.name,
      active: false,
      verificationRequired: true,
    });
    updateMany.mockResolvedValue({ count: 0 });

    await expect(prepareAnonymousPropertyAlert(input, NOW)).resolves.toEqual({
      kind: "cooldown",
    });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("rotates the version after it claims a pending resend", async () => {
    findUnique
      .mockResolvedValueOnce({
        id: "alert-1",
        email: input.email,
        name: input.name,
        active: false,
        verificationRequired: true,
      })
      .mockResolvedValueOnce({
        id: "alert-1",
        email: input.email,
        name: input.name,
        verificationVersion: 4,
        verificationSentAt: NOW,
      });
    updateMany.mockResolvedValue({ count: 1 });

    await expect(prepareAnonymousPropertyAlert(input, NOW)).resolves.toMatchObject({
      kind: "confirmation",
      verificationVersion: 4,
    });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ verificationVersion: { increment: 1 } }),
    }));
  });

  it("does not change criteria for an existing verified alert", async () => {
    findUnique.mockResolvedValue({
      id: "alert-1",
      email: input.email,
      name: "Original Owner",
      active: true,
      verificationRequired: false,
    });
    updateMany.mockResolvedValue({ count: 1 });

    await expect(prepareAnonymousPropertyAlert(input, NOW)).resolves.toMatchObject({
      kind: "ownership_notice",
      name: "Original Owner",
    });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { verificationSentAt: NOW },
    }));
  });

  it("retries once after a unique-create race", async () => {
    findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "alert-1",
        email: input.email,
        name: input.name,
        active: false,
        verificationRequired: true,
      });
    create.mockRejectedValue({ code: "P2002" });
    updateMany.mockResolvedValue({ count: 0 });

    await expect(prepareAnonymousPropertyAlert(input, NOW)).resolves.toEqual({
      kind: "cooldown",
    });
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("releases only the claimed cooldown after an email failure", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await releasePropertyAlertEmailCooldown("alert-1", NOW);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "alert-1", verificationSentAt: NOW },
      data: { verificationSentAt: null },
    });
  });
});
