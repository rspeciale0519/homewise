import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanupExpiredRateLimitBuckets } from "./cleanup";

function asDatabase(deleteMany: ReturnType<typeof vi.fn>): PrismaClient {
  return {
    rateLimitBucket: { deleteMany },
  } as unknown as PrismaClient;
}

describe("cleanupExpiredRateLimitBuckets", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes only buckets older than the supplied cutoff", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const expiredBefore = new Date("2026-08-27T12:00:00.000Z");

    await expect(cleanupExpiredRateLimitBuckets({
      expiredBefore,
      database: asDatabase(deleteMany),
    })).resolves.toBe(4);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expiredBefore } },
    });
  });

  it("keeps a one-day safety margin by default", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });

    await cleanupExpiredRateLimitBuckets({ database: asDatabase(deleteMany) });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: new Date("2026-08-26T12:00:00.000Z") },
      },
    });
  });

  it("rejects an invalid cutoff before it queries PostgreSQL", async () => {
    const deleteMany = vi.fn();

    await expect(cleanupExpiredRateLimitBuckets({
      expiredBefore: new Date(Number.NaN),
      database: asDatabase(deleteMany),
    })).rejects.toThrow("expiredBefore must be a valid date");
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
