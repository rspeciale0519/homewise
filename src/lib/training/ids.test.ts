import { describe, expect, it } from "vitest";
import {
  defaultSectionIdForCourse,
  trainingCategoryIdFromName,
} from "./ids";

describe("trainingCategoryIdFromName", () => {
  it("converts a plain name to a cat- prefixed slug", () => {
    expect(trainingCategoryIdFromName("Buyer Education")).toBe(
      "cat-buyer-education",
    );
  });

  it("matches the SQL backfill behaviour for underscore-bearing names", () => {
    // The v1 SQL migration normalizes underscores to hyphens BEFORE the
    // non-alphanumeric collapse, so 'agent_onboarding' and 'Agent Onboarding'
    // both backfill to the same category id.
    expect(trainingCategoryIdFromName("agent_onboarding")).toBe(
      "cat-agent-onboarding",
    );
    expect(trainingCategoryIdFromName("Agent Onboarding")).toBe(
      "cat-agent-onboarding",
    );
  });

  it("collapses non-alphanumeric runs and trims hyphens", () => {
    expect(trainingCategoryIdFromName("  Hello, World!! ")).toBe(
      "cat-hello-world",
    );
    expect(trainingCategoryIdFromName("Sales / Marketing")).toBe(
      "cat-sales-marketing",
    );
  });

  it("lowercases and strips diacritics consistently", () => {
    expect(trainingCategoryIdFromName("Crédit Hypothécaire")).toBe(
      "cat-credit-hypothecaire",
    );
  });

  it("returns null for empty / whitespace-only / punctuation-only names", () => {
    expect(trainingCategoryIdFromName("")).toBeNull();
    expect(trainingCategoryIdFromName("   ")).toBeNull();
    expect(trainingCategoryIdFromName("!!!")).toBeNull();
  });

  it("is stable: same input yields same id (deterministic)", () => {
    expect(trainingCategoryIdFromName("Listing Workflow")).toBe(
      trainingCategoryIdFromName("listing  workflow"),
    );
  });
});

describe("defaultSectionIdForCourse", () => {
  it("returns sec-<courseId>", () => {
    expect(defaultSectionIdForCourse("ckxyz123")).toBe("sec-ckxyz123");
  });

  it("is deterministic for a given course id", () => {
    const id = "cmpf485p8000ajs042d63s7wl";
    expect(defaultSectionIdForCourse(id)).toBe(defaultSectionIdForCourse(id));
  });

  it("does not coerce the course id (preserves casing + characters)", () => {
    expect(defaultSectionIdForCourse("ABC-123_xyz")).toBe(
      "sec-ABC-123_xyz",
    );
  });
});
