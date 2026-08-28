import { z } from "zod";

const leadScoringResultSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    brief: z.string().trim().min(1).max(1_000),
    suggestedAction: z.string().trim().min(1).max(500),
  })
  .strict();

export type LeadScoringResult = z.infer<typeof leadScoringResultSchema>;

export function parseLeadScoringResult(
  content: string,
  fallbackScore: number,
): LeadScoringResult {
  const fallback: LeadScoringResult = {
    score: Math.min(100, Math.max(0, Math.round(fallbackScore))),
    brief: "Unable to generate brief.",
    suggestedAction: "Review manually.",
  };

  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return fallback;

  try {
    const parsedJson: unknown = JSON.parse(match[0]);
    const parsed = leadScoringResultSchema.safeParse(parsedJson);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}
