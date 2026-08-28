import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "./rate-limit";

function limiter(): InMemoryRateLimiter {
  return new InMemoryRateLimiter({ windowMs: 60_000, maxBuckets: 100 });
}

describe("InMemoryRateLimiter", () => {
  it("limits one session independently of other sessions", () => {
    const rateLimiter = limiter();
    const now = 1_000;

    expect(rateLimiter.consume([{ key: "session:a", limit: 1 }], now).allowed).toBe(true);
    expect(rateLimiter.consume([{ key: "session:a", limit: 1 }], now).allowed).toBe(false);
    expect(rateLimiter.consume([{ key: "session:b", limit: 1 }], now).allowed).toBe(true);
  });

  it("limits one IP across different sessions", () => {
    const rateLimiter = limiter();
    const now = 1_000;

    expect(rateLimiter.consume([
      { key: "ip:203.0.113.10", limit: 2 },
      { key: "session:a", limit: 10 },
    ], now).allowed).toBe(true);
    expect(rateLimiter.consume([
      { key: "ip:203.0.113.10", limit: 2 },
      { key: "session:b", limit: 10 },
    ], now).allowed).toBe(true);
    expect(rateLimiter.consume([
      { key: "ip:203.0.113.10", limit: 2 },
      { key: "session:c", limit: 10 },
    ], now).allowed).toBe(false);
  });

  it("allows requests after the window resets", () => {
    const rateLimiter = limiter();

    expect(rateLimiter.consume([{ key: "session:a", limit: 1 }], 1_000).allowed).toBe(true);
    expect(rateLimiter.consume([{ key: "session:a", limit: 1 }], 61_000).allowed).toBe(true);
  });
});
