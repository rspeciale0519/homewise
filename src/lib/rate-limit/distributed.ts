import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  InMemoryRateLimiter,
  type RateLimitResult,
  type RateLimitRule,
} from "@/lib/chatbot/rate-limit";
import { prisma } from "@/lib/prisma";

const MAX_POSTGRES_INTEGER = 2_147_483_647;
const DEFAULT_TRANSACTION_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 5;
const DEFAULT_UNAVAILABLE_RETRY_SECONDS = 5;

export type { RateLimitResult, RateLimitRule };

export interface DistributedRateLimitResult extends RateLimitResult {
  unavailable?: true;
}

export interface DistributedRateLimiterOptions {
  windowMs: number;
  maxBuckets: number;
  namespace?: string;
  transactionAttempts?: number;
  retryBaseDelayMs?: number;
  unavailableRetryAfterSeconds?: number;
}

interface NormalizedRule {
  key: string;
  limit: number;
}

class RateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

function positiveInteger(value: number, name: string, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new RangeError(`${name} must be a positive integer no greater than ${maximum}`);
  }
  return value;
}

function deploymentNamespace(): string {
  const vercelEnvironment = process.env.VERCEL_ENV?.trim();
  if (vercelEnvironment) return `homewise:${vercelEnvironment}`;
  return `homewise:${process.env.NODE_ENV ?? "unknown"}`;
}

function normalizeRules(rules: RateLimitRule[]): NormalizedRule[] {
  const uniqueRules = new Map<string, number>();

  for (const rule of rules) {
    if (!rule.key || !Number.isSafeInteger(rule.limit) || rule.limit <= 0) continue;
    const currentLimit = uniqueRules.get(rule.key);
    uniqueRules.set(rule.key, currentLimit === undefined ? rule.limit : Math.min(currentLimit, rule.limit));
  }

  // Keep database lock order stable when callers supply the same rules differently.
  return [...uniqueRules]
    .map(([key, limit]) => ({ key, limit }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function delay(milliseconds: number): Promise<void> {
  return milliseconds > 0
    ? new Promise((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve();
}

export class DistributedRateLimiter {
  private readonly windowMs: number;
  private readonly namespace: string;
  private readonly transactionAttempts: number;
  private readonly retryBaseDelayMs: number;
  private readonly unavailableRetryAfterSeconds: number;
  private readonly memoryFallback: InMemoryRateLimiter;

  constructor(
    options: DistributedRateLimiterOptions,
    private readonly database: PrismaClient = prisma,
  ) {
    this.windowMs = positiveInteger(options.windowMs, "windowMs", MAX_POSTGRES_INTEGER);
    this.namespace = options.namespace?.trim() || deploymentNamespace();
    this.transactionAttempts = positiveInteger(
      options.transactionAttempts ?? DEFAULT_TRANSACTION_ATTEMPTS,
      "transactionAttempts",
      10,
    );
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    if (!Number.isSafeInteger(this.retryBaseDelayMs) || this.retryBaseDelayMs < 0) {
      throw new RangeError("retryBaseDelayMs must be a non-negative integer");
    }
    this.unavailableRetryAfterSeconds = positiveInteger(
      options.unavailableRetryAfterSeconds ?? DEFAULT_UNAVAILABLE_RETRY_SECONDS,
      "unavailableRetryAfterSeconds",
    );
    this.memoryFallback = new InMemoryRateLimiter({
      windowMs: this.windowMs,
      maxBuckets: positiveInteger(options.maxBuckets, "maxBuckets"),
    });
  }

  async consume(
    rules: RateLimitRule[],
    now = Date.now(),
  ): Promise<DistributedRateLimitResult> {
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new RangeError("now must be a non-negative integer timestamp");
    }

    const normalizedRules = normalizeRules(rules);
    if (normalizedRules.length === 0) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    try {
      return await this.consumeFromPostgres(normalizedRules, now);
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return {
          allowed: false,
          retryAfterSeconds: error.retryAfterSeconds,
        };
      }

      this.reportUnavailable(error);
      if (process.env.NODE_ENV === "development") {
        return this.memoryFallback.consume(normalizedRules, now);
      }

      return {
        allowed: false,
        retryAfterSeconds: this.unavailableRetryAfterSeconds,
        unavailable: true,
      };
    }
  }

  clear(): void {
    this.memoryFallback.clear();
  }

  private async consumeFromPostgres(
    rules: NormalizedRule[],
    now: number,
  ): Promise<RateLimitResult> {
    const windowStartMs = Math.floor(now / this.windowMs) * this.windowMs;
    const windowStart = new Date(windowStartMs);
    const expiresAt = new Date(windowStartMs + this.windowMs);
    const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000));

    for (let attempt = 0; attempt < this.transactionAttempts; attempt += 1) {
      try {
        return await this.database.$transaction(
          async (transaction) => {
            for (const rule of rules) {
              const keyHash = createHash("sha256")
                .update(this.namespace)
                .update("\0")
                .update(rule.key)
                .digest("hex");
              const bucket = await transaction.rateLimitBucket.upsert({
                where: {
                  keyHash_windowStart_windowMs: {
                    keyHash,
                    windowStart,
                    windowMs: this.windowMs,
                  },
                },
                create: {
                  keyHash,
                  windowStart,
                  windowMs: this.windowMs,
                  count: 1,
                  expiresAt,
                },
                update: {
                  count: { increment: 1 },
                  expiresAt,
                },
                select: { count: true },
              });

              if (bucket.count > rule.limit) {
                throw new RateLimitExceededError(retryAfterSeconds);
              }
            }

            return { allowed: true, retryAfterSeconds: 0 };
          },
          { isolationLevel: "Serializable" },
        );
      } catch (error) {
        const canRetry = prismaErrorCode(error) === "P2034"
          && attempt + 1 < this.transactionAttempts;
        if (!canRetry) throw error;

        const backoff = this.retryBaseDelayMs === 0
          ? 0
          : (this.retryBaseDelayMs * (2 ** attempt)) + Math.floor(Math.random() * 5);
        await delay(backoff);
      }
    }

    throw new Error("Shared rate limit transaction failed");
  }

  private reportUnavailable(error: unknown): void {
    console.error("[rate-limit] shared limiter unavailable", {
      code: prismaErrorCode(error) ?? "unknown",
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
