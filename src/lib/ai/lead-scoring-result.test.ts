import { describe, expect, it } from "vitest";
import { parseLeadScoringResult } from "./lead-scoring-result";

describe("parseLeadScoringResult", () => {
  it("accepts a valid result inside a fenced response", () => {
    const result = parseLeadScoringResult(
      '```json\n{"score":82,"brief":"Ready to act.","suggestedAction":"Call today."}\n```',
      25,
    );

    expect(result).toEqual({
      score: 82,
      brief: "Ready to act.",
      suggestedAction: "Call today.",
    });
  });

  it("rejects out-of-range scores", () => {
    const result = parseLeadScoringResult(
      '{"score":1000,"brief":"High priority.","suggestedAction":"Call."}',
      31,
    );

    expect(result.score).toBe(31);
  });

  it("rejects wrong field types and unexpected fields", () => {
    const result = parseLeadScoringResult(
      '{"score":"90","brief":"High priority.","suggestedAction":"Call.","role":"admin"}',
      44,
    );

    expect(result).toEqual({
      score: 44,
      brief: "Unable to generate brief.",
      suggestedAction: "Review manually.",
    });
  });

  it("clamps an invalid stored fallback score", () => {
    expect(parseLeadScoringResult("invalid", 120).score).toBe(100);
    expect(parseLeadScoringResult("invalid", -5).score).toBe(0);
  });
});
