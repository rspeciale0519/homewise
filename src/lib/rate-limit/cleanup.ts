import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_SAFETY_MARGIN_MS = 24 * 60 * 60_000;

interface CleanupRateLimitBucketsOptions {
  expiredBefore?: Date;
  database?: PrismaClient;
}

export async function cleanupExpiredRateLimitBuckets(
  options: CleanupRateLimitBucketsOptions = {},
): Promise<number> {
  const expiredBefore = options.expiredBefore
    ?? new Date(Date.now() - DEFAULT_SAFETY_MARGIN_MS);
  if (!Number.isFinite(expiredBefore.getTime())) {
    throw new RangeError("expiredBefore must be a valid date");
  }

  const result = await (options.database ?? prisma).rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: expiredBefore } },
  });
  return result.count;
}
