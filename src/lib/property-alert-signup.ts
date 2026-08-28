import type { PropertyAlertInput } from "@/schemas/property-alert.schema";
import { prisma } from "@/lib/prisma";

const RESEND_COOLDOWN_MS = 10 * 60_000;

interface PreparedEmailBase {
  alertId: string;
  email: string;
  name: string | null;
  sentAt: Date;
}

export type PreparedAnonymousAlert =
  | ({ kind: "confirmation"; verificationVersion: number } & PreparedEmailBase)
  | ({ kind: "ownership_notice" } & PreparedEmailBase)
  | { kind: "cooldown" };

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function criteriaData(input: PropertyAlertInput) {
  return {
    name: input.name || null,
    cities: input.cities,
    minPrice: input.minPrice ?? null,
    maxPrice: input.maxPrice ?? null,
    beds: input.beds ?? null,
  };
}

function cooldownWhere(now: Date) {
  return {
    OR: [
      { verificationSentAt: null },
      { verificationSentAt: { lt: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
    ],
  };
}

export async function prepareAnonymousPropertyAlert(
  input: PropertyAlertInput,
  now = new Date(),
  allowRaceRetry = true,
): Promise<PreparedAnonymousAlert> {
  const existing = await prisma.propertyAlert.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      name: true,
      active: true,
      verificationRequired: true,
    },
  });

  if (!existing) {
    try {
      const created = await prisma.propertyAlert.create({
        data: {
          email: input.email,
          ...criteriaData(input),
          active: false,
          verificationRequired: true,
          verificationVersion: 1,
          verificationSentAt: now,
        },
        select: {
          id: true,
          email: true,
          name: true,
          verificationVersion: true,
          verificationSentAt: true,
        },
      });
      return {
        kind: "confirmation",
        alertId: created.id,
        email: created.email,
        name: created.name,
        verificationVersion: created.verificationVersion,
        sentAt: created.verificationSentAt ?? now,
      };
    } catch (error) {
      if (allowRaceRetry && errorCode(error) === "P2002") {
        return prepareAnonymousPropertyAlert(input, now, false);
      }
      throw error;
    }
  }

  if (!existing.verificationRequired) {
    const claimed = await prisma.propertyAlert.updateMany({
      where: {
        id: existing.id,
        verificationRequired: false,
        ...cooldownWhere(now),
      },
      data: { verificationSentAt: now },
    });
    return claimed.count === 1
      ? {
          kind: "ownership_notice",
          alertId: existing.id,
          email: existing.email,
          name: existing.name,
          sentAt: now,
        }
      : { kind: "cooldown" };
  }

  const claimed = await prisma.propertyAlert.updateMany({
    where: {
      id: existing.id,
      active: false,
      verificationRequired: true,
      ...cooldownWhere(now),
    },
    data: {
      ...criteriaData(input),
      verificationVersion: { increment: 1 },
      verificationSentAt: now,
    },
  });
  if (claimed.count !== 1) return { kind: "cooldown" };

  const pending = await prisma.propertyAlert.findUnique({
    where: { id: existing.id },
    select: {
      id: true,
      email: true,
      name: true,
      verificationVersion: true,
      verificationSentAt: true,
    },
  });
  if (!pending) throw new Error("Claimed property alert no longer exists");

  return {
    kind: "confirmation",
    alertId: pending.id,
    email: pending.email,
    name: pending.name,
    verificationVersion: pending.verificationVersion,
    sentAt: pending.verificationSentAt ?? now,
  };
}

export async function releasePropertyAlertEmailCooldown(
  alertId: string,
  sentAt: Date,
): Promise<void> {
  await prisma.propertyAlert.updateMany({
    where: { id: alertId, verificationSentAt: sentAt },
    data: { verificationSentAt: null },
  });
}
