import { describe, it, expect } from "vitest";
import { estimateCost, AI_PRICING } from "@/lib/ai-pricing";

describe("AI_PRICING constants", () => {
  it("contains expected models", () => {
    expect(AI_PRICING["claude-sonnet"]).toBeDefined();
    expect(AI_PRICING["claude-haiku"]).toBeDefined();
    expect(AI_PRICING["gpt-4o-mini"]).toBeDefined();
    expect(AI_PRICING.default).toBeDefined();
  });

  it("all models have input and output rates", () => {
    for (const [, pricing] of Object.entries(AI_PRICING)) {
      expect(pricing.input).toBeGreaterThan(0);
      expect(pricing.output).toBeGreaterThan(0);
    }
  });
});

describe("estimateCost", () => {
  it("returns 0 for zero tokens", () => {
    expect(estimateCost(0, 0)).toBe(0);
  });

  it("calculates cost for claude-sonnet", () => {
    const cost = estimateCost(1_000_000, 1_000_000, "claude-sonnet");
    expect(cost).toBe(3 + 15);
  });

  it("calculates cost for claude-haiku", () => {
    const cost = estimateCost(1_000_000, 1_000_000, "claude-haiku");
    expect(cost).toBe(0.25 + 1.25);
  });

  it("calculates cost for gpt-4o-mini", () => {
    const cost = estimateCost(1_000_000, 1_000_000, "gpt-4o-mini");
    expect(cost).toBe(0.15 + 0.6);
  });

  it("falls back to default for unknown model", () => {
    const cost = estimateCost(1_000_000, 1_000_000, "unknown-model");
    const defaultCost = AI_PRICING.default.input + AI_PRICING.default.output;
    expect(cost).toBe(defaultCost);
  });

  it("falls back to default when model is undefined", () => {
    const cost = estimateCost(1_000_000, 1_000_000);
    const defaultCost = AI_PRICING.default.input + AI_PRICING.default.output;
    expect(cost).toBe(defaultCost);
  });

  it("handles partial token counts", () => {
    const cost = estimateCost(500_000, 0, "claude-sonnet");
    expect(cost).toBe(1.5);
  });

  it("handles output-only tokens", () => {
    const cost = estimateCost(0, 500_000, "claude-sonnet");
    expect(cost).toBe(7.5);
  });
});
