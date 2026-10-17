import { describe, expect, it } from "vitest";
import { isSafeLeadSource } from "./lead-source-value";

describe("isSafeLeadSource", () => {
  it("accepts short tracking tokens", () => {
    expect(isSafeLeadSource("google-ads")).toBe(true);
    expect(isSafeLeadSource("fb_cpc")).toBe(true);
    expect(isSafeLeadSource("partner.1")).toBe(true);
  });

  it("rejects cookie-injection and overlong values", () => {
    expect(isSafeLeadSource("ok\r\nSet-Cookie: session=stolen")).toBe(false);
    expect(isSafeLeadSource("evil; Path=/")).toBe(false);
    expect(isSafeLeadSource("a".repeat(65))).toBe(false);
    expect(isSafeLeadSource("")).toBe(false);
    expect(isSafeLeadSource(null)).toBe(false);
  });
});
