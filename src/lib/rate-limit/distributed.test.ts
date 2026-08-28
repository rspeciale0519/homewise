import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DistributedRateLimiter } from "./distributed";

interface MockTransaction {
  rateLimitBucket: {
    upsert: ReturnType<typeof vi.fn>;
  };
}

type TransactionCallback = (transaction: MockTransaction) => Promise<unknown>;

function asDatabase(transaction: ReturnType<typeof vi.fn>): PrismaClient {
  return { $transaction: transaction } as unknown as PrismaClient;
}

function createLimiter(
  transaction: ReturnType<typeof vi.fn>,
  options: Partial<ConstructorParameters<typeof DistributedRateLimiter>[0]> = {},
): DistributedRateLimiter {
  return new DistributedRateLimiter(
    {
      windowMs: 60_000,
      maxBuckets: 100,
      namespace: "homewise:test",
      retryBaseDelayMs: 0,
      ...options,
    },
    asDatabase(transaction),
  );
}

describe("DistributedRateLimiter", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses hashed keys and a fixed window in one serializable transaction", async () => {
    const upsert = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = vi.fn(
      async (callback: TransactionCallback) => callback({ rateLimitBucket: { upsert } }),
    );
    const limiter = createLimiter(transaction);

    await expect(limiter.consume([
      { key: "chat:ip:203.0.113.10", limit: 5 },
    ], 75_000)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });

    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        keyHash_windowStart_windowMs: {
          keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          windowStart: new Date(60_000),
          windowMs: 60_000,
        },
      },
      create: {
        keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        windowStart: new Date(60_000),
        windowMs: 60_000,
        count: 1,
        expiresAt: new Date(120_000),
      },
      update: {
        count: { increment: 1 },
        expiresAt: new Date(120_000),
      },
      select: { count: true },
    });

    const firstCall = upsert.mock.calls[0]?.[0] as {
      create?: { keyHash?: string };
    } | undefined;
    expect(firstCall?.create?.keyHash).not.toContain("203.0.113.10");
  });

  it("uses the strictest limit for duplicate keys", async () => {
    const upsert = vi.fn().mockResolvedValue({ count: 2 });
    const transaction = vi.fn(
      async (callback: TransactionCallback) => callback({ rateLimitBucket: { upsert } }),
    );
    const limiter = createLimiter(transaction);

    await expect(limiter.consume([
      { key: "user:one", limit: 10 },
      { key: "user:one", limit: 1 },
    ], 90_000)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    });
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("rolls back all rule increments when one rule exceeds its limit", async () => {
    const upsert = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });
    let rolledBack = false;
    const transaction = vi.fn(async (callback: TransactionCallback) => {
      try {
        return await callback({ rateLimitBucket: { upsert } });
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    });
    const limiter = createLimiter(transaction);

    await expect(limiter.consume([
      { key: "ip:203.0.113.10", limit: 1 },
      { key: "email:person@example.com", limit: 5 },
    ], 90_000)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(rolledBack).toBe(true);
  });

  it("retries P2034 conflicts before it permits the request", async () => {
    const upsert = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = vi.fn()
      .mockRejectedValueOnce({ code: "P2034" })
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementationOnce(
        async (callback: TransactionCallback) => callback({ rateLimitBucket: { upsert } }),
      );
    const limiter = createLimiter(transaction, { transactionAttempts: 3 });

    await expect(limiter.consume([
      { key: "user:one", limit: 1 },
    ], 1_000)).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("fails closed after all P2034 attempts fail", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const transaction = vi.fn().mockRejectedValue({ code: "P2034" });
    const limiter = createLimiter(transaction, { transactionAttempts: 3 });

    await expect(limiter.consume([
      { key: "user:one", limit: 1 },
    ], 1_000)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 5,
      unavailable: true,
    });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("fails closed outside development when PostgreSQL is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const transaction = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const limiter = createLimiter(transaction, { unavailableRetryAfterSeconds: 7 });

    await expect(limiter.consume([
      { key: "user:one", limit: 2 },
    ], 1_000)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 7,
      unavailable: true,
    });
  });

  it("uses the in-memory fallback only during development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const transaction = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const limiter = createLimiter(transaction);
    const rules = [{ key: "user:one", limit: 1 }];

    await expect(limiter.consume(rules, 1_000)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    await expect(limiter.consume(rules, 1_000)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("allows an empty rule list without a database transaction", async () => {
    const transaction = vi.fn();
    const limiter = createLimiter(transaction);

    await expect(limiter.consume([], 1_000)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});
