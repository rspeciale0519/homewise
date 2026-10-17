import { describe, expect, it } from "vitest";
import {
  AI_RATE_LIMIT_MAX_PER_USER,
  AI_RATE_LIMIT_MAX_REQUESTS,
  AiRateLimitExceededError,
  aiRateLimitRules,
  assertAiRateLimitAllowed,
} from "./rate-limit";

describe("aiRateLimitRules", () => {
  it("always includes a shared global bucket", () => {
    expect(aiRateLimitRules()).toEqual([
      { key: "global", limit: AI_RATE_LIMIT_MAX_REQUESTS },
    ]);
  });

  it("adds a per-user bucket when a caller id is present", () => {
    expect(aiRateLimitRules("user-a")).toEqual([
      { key: "global", limit: AI_RATE_LIMIT_MAX_REQUESTS },
      { key: "user:user-a", limit: AI_RATE_LIMIT_MAX_PER_USER },
    ]);
  });
});

describe("assertAiRateLimitAllowed", () => {
  it("allows a successful consume", () => {
    expect(() =>
      assertAiRateLimitAllowed({ allowed: true, retryAfterSeconds: 0 }),
    ).not.toThrow();
  });

  it("fails closed when the shared limiter denies or is unavailable", () => {
    expect(() =>
      assertAiRateLimitAllowed({ allowed: false, retryAfterSeconds: 12 }),
    ).toThrow(AiRateLimitExceededError);

    try {
      assertAiRateLimitAllowed({
        allowed: false,
        retryAfterSeconds: 5,
        unavailable: true,
      });
      throw new Error("expected rate limit error");
    } catch (error) {
      expect(error).toBeInstanceOf(AiRateLimitExceededError);
      if (error instanceof AiRateLimitExceededError) {
        expect(error.unavailable).toBe(true);
        expect(error.retryAfterSeconds).toBe(5);
      }
    }
  });
});
