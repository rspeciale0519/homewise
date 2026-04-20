import { describe, it, expect } from "vitest";
import { platformFilter, resolveAgentPlatform } from "../filter";

describe("platformFilter", () => {
  it("defaults to homewise when called with no argument", () => {
    expect(platformFilter()).toEqual({ platforms: { has: "homewise" } });
  });

  it("produces a has-clause for the specified platform", () => {
    expect(platformFilter("riusa")).toEqual({ platforms: { has: "riusa" } });
    expect(platformFilter("homewise")).toEqual({ platforms: { has: "homewise" } });
  });
});

describe("resolveAgentPlatform", () => {
  it("defaults to homewise when agent is null", () => {
    expect(resolveAgentPlatform(null)).toBe("homewise");
  });

  it("returns the agent's platform", () => {
    expect(resolveAgentPlatform({ platform: "homewise" })).toBe("homewise");
    expect(resolveAgentPlatform({ platform: "riusa" })).toBe("riusa");
  });

  it("falls back to homewise on unexpected values", () => {
    expect(resolveAgentPlatform({ platform: "" })).toBe("homewise");
    expect(resolveAgentPlatform({ platform: "whatever" } as { platform: string })).toBe("homewise");
  });
});
