import {
  DistributedRateLimiter,
  type RateLimitRule,
} from "@/lib/rate-limit/distributed";
import { trustedClientIp } from "@/lib/trusted-client";

export const publicMutationRateLimiter = new DistributedRateLimiter({
  windowMs: 60 * 60_000,
  maxBuckets: 50_000,
  namespace: "public-mutation",
});

export function clientIpRateRule(
  request: Request,
  scope: string,
  limit: number,
): RateLimitRule | null {
  const address = trustedClientIp(request);
  return address ? { key: `${scope}:ip:${address}`, limit } : null;
}
