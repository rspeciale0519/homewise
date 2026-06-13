import { prisma } from "@/lib/prisma";

/**
 * Bump when the VOW Terms of Use materially change. Consumers must re-accept
 * when their accepted version is older than the current one.
 */
export const VOW_TERMS_VERSION = "2026-06-13";

export interface VowStatus {
  registered: boolean;
  needsReaccept: boolean;
  acceptedVersion: string | null;
  acceptedAt: Date | null;
}

/**
 * Whether a user has an active VOW registration on the current terms version.
 * The established broker-consumer relationship (MLS Grid VOW definition) is
 * represented by an authenticated account plus this affirmative terms assent.
 */
export async function getVowStatus(userId: string | null | undefined): Promise<VowStatus> {
  if (!userId) {
    return { registered: false, needsReaccept: false, acceptedVersion: null, acceptedAt: null };
  }
  const reg = await prisma.vowRegistration.findUnique({ where: { userId } });
  if (!reg || reg.revokedAt) {
    return { registered: false, needsReaccept: false, acceptedVersion: null, acceptedAt: null };
  }
  const current = reg.termsVersion === VOW_TERMS_VERSION;
  return {
    registered: current,
    needsReaccept: !current,
    acceptedVersion: reg.termsVersion,
    acceptedAt: reg.acceptedAt,
  };
}

export async function isVowRegistered(userId: string | null | undefined): Promise<boolean> {
  return (await getVowStatus(userId)).registered;
}

export async function recordVowRegistration(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null },
): Promise<void> {
  await prisma.vowRegistration.upsert({
    where: { userId },
    update: {
      termsVersion: VOW_TERMS_VERSION,
      acceptedAt: new Date(),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      revokedAt: null,
    },
    create: {
      userId,
      termsVersion: VOW_TERMS_VERSION,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
}
