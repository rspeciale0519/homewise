import { describe, expect, it } from "vitest";
import { resolveTrustedReturnUrl } from "./return-url";

const SITE_URL = "https://app.homewisefl.com";

describe("resolveTrustedReturnUrl", () => {
  it("keeps normalized dot-segment paths on the trusted origin", () => {
    expect(
      resolveTrustedReturnUrl(
        "https://app.homewisefl.com/.//evil.example",
        "/dashboard/billing",
        SITE_URL,
      ),
    ).toBe("https://app.homewisefl.com//evil.example");
  });

  it("rejects an external origin", () => {
    expect(
      resolveTrustedReturnUrl(
        "https://evil.example/checkout",
        "/dashboard/billing",
        SITE_URL,
      ),
    ).toBeNull();
  });

  it("uses the trusted fallback when the target is missing", () => {
    expect(
      resolveTrustedReturnUrl(undefined, "/dashboard/billing", SITE_URL),
    ).toBe("https://app.homewisefl.com/dashboard/billing");
  });
});
