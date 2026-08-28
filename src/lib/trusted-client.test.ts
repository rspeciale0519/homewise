import { afterEach, describe, expect, it } from "vitest";
import {
  boundedStoredValue,
  boundedUserAgent,
  MAX_STORED_USER_AGENT_LENGTH,
  trustedClientIp,
} from "./trusted-client";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
});

describe("trusted client metadata", () => {
  it("uses only Vercel's protected forwarding header in production", () => {
    process.env.VERCEL = "1";
    const request = new Request("https://homewisefl.com", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.8, 76.76.21.21",
        "x-forwarded-for": "10.0.0.1",
        "x-real-ip": "127.0.0.1",
      },
    });

    expect(trustedClientIp(request)).toBe("203.0.113.8");
  });

  it("does not trust client-supplied proxy headers outside Vercel", () => {
    delete process.env.VERCEL;
    const request = new Request("http://localhost", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.8",
        "x-forwarded-for": "198.51.100.9",
      },
    });

    expect(trustedClientIp(request)).toBeNull();
  });

  it.each(["not-an-ip", "1.2.3.4:8080", `${"1".repeat(46)}`])(
    "rejects malformed forwarded address %s",
    (address) => {
      process.env.VERCEL = "1";
      const request = new Request("https://homewisefl.com", {
        headers: { "x-vercel-forwarded-for": address },
      });

      expect(trustedClientIp(request)).toBeNull();
    },
  );

  it("bounds user-agent data before storage", () => {
    const request = new Request("https://homewisefl.com", {
      headers: { "user-agent": "a".repeat(MAX_STORED_USER_AGENT_LENGTH + 50) },
    });

    expect(boundedUserAgent(request)).toHaveLength(MAX_STORED_USER_AGENT_LENGTH);
  });

  it("removes control characters from bounded stored values", () => {
    expect(boundedStoredValue(" client\u0000 value\n", 20)).toBe("client  value");
  });
});
