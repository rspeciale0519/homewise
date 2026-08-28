import { afterEach, describe, expect, it } from "vitest";
import { clientIpRateRule } from "./public-rate-limit";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
});

describe("clientIpRateRule", () => {
  it("uses the trusted Vercel forwarding header", () => {
    process.env.VERCEL = "1";
    const request = new Request("https://homewisefl.com", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.8, 76.76.21.21",
        "x-forwarded-for": "198.51.100.9",
      },
    });

    expect(clientIpRateRule(request, "contact", 30)).toEqual({
      key: "contact:ip:203.0.113.8",
      limit: 30,
    });
  });

  it("ignores client-supplied forwarding headers outside Vercel", () => {
    delete process.env.VERCEL;
    const request = new Request("http://localhost", {
      headers: {
        "x-real-ip": "203.0.113.8",
        "x-forwarded-for": "198.51.100.9",
      },
    });

    expect(clientIpRateRule(request, "contact", 30)).toBeNull();
  });
});
