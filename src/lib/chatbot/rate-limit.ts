interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitRule {
  key: string;
  limit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface InMemoryRateLimiterOptions {
  windowMs: number;
  maxBuckets: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly options: InMemoryRateLimiterOptions) {}

  consume(rules: RateLimitRule[], now = Date.now()): RateLimitResult {
    this.prune(now);

    const uniqueRules = new Map<string, number>();
    for (const rule of rules) {
      if (rule.key && rule.limit > 0) uniqueRules.set(rule.key, rule.limit);
    }

    let retryAfterMs = 0;
    for (const [key, limit] of uniqueRules) {
      const bucket = this.buckets.get(key);
      if (bucket && bucket.resetAt > now && bucket.count >= limit) {
        retryAfterMs = Math.max(retryAfterMs, bucket.resetAt - now);
      }
    }

    if (retryAfterMs > 0) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    for (const key of uniqueRules.keys()) {
      const bucket = this.buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        this.buckets.set(key, {
          count: 1,
          resetAt: now + this.options.windowMs,
        });
      } else {
        bucket.count += 1;
      }
    }

    this.prune(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  clear(): void {
    this.buckets.clear();
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }

    while (this.buckets.size > this.options.maxBuckets) {
      const oldestKey = this.buckets.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.buckets.delete(oldestKey);
    }
  }
}
