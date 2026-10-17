import { DistributedRateLimiter } from "@/lib/rate-limit/distributed";
import type { DistributedRateLimitResult, RateLimitRule } from "@/lib/rate-limit/distributed";

export const AI_RATE_LIMIT_WINDOW_MS = 60_000;
export const AI_RATE_LIMIT_MAX_REQUESTS = 30;
export const AI_RATE_LIMIT_MAX_PER_USER = 10;

const limiter = new DistributedRateLimiter({
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  maxBuckets: 10_000,
  namespace: "ai-complete",
});

export class AiRateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;
  readonly unavailable: boolean;

  constructor(retryAfterSeconds: number, unavailable = false) {
    super("AI rate limit exceeded. Please try again in a moment.");
    this.name = "AiRateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.unavailable = unavailable;
  }
}

export function aiRateLimitRules(userId?: string): RateLimitRule[] {
  const rules: RateLimitRule[] = [
    { key: "global", limit: AI_RATE_LIMIT_MAX_REQUESTS },
  ];
  if (userId) {
    rules.push({ key: `user:${userId}`, limit: AI_RATE_LIMIT_MAX_PER_USER });
  }
  return rules;
}

export function assertAiRateLimitAllowed(result: DistributedRateLimitResult): void {
  if (result.allowed) return;
  throw new AiRateLimitExceededError(
    result.retryAfterSeconds,
    Boolean(result.unavailable),
  );
}

export async function enforceAiRateLimit(userId?: string): Promise<void> {
  const result = await limiter.consume(aiRateLimitRules(userId));
  assertAiRateLimitAllowed(result);
}
