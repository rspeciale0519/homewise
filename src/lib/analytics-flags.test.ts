import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsBoEnabled, withBo } from "./analytics-flags";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analyticsBoEnabled", () => {
  it("is false by default", () => {
    vi.stubEnv("ANALYTICS_BO_ENABLED", "");
    expect(analyticsBoEnabled()).toBe(false);
  });

  it("is true only when explicitly set to true", () => {
    vi.stubEnv("ANALYTICS_BO_ENABLED", "true");
    expect(analyticsBoEnabled()).toBe(true);

    vi.stubEnv("ANALYTICS_BO_ENABLED", "TRUE");
    expect(analyticsBoEnabled()).toBe(false);
  });
});

describe("withBo", () => {
  it("adds the BO MLS data clause", () => {
    expect(withBo({ city: "Orlando" })).toEqual({
      city: "Orlando",
      mlgCanUse: { has: "BO" },
    });
  });
});
