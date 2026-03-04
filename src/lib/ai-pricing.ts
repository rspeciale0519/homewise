/**
 * AI model pricing constants (per 1M tokens).
 * Update these when Anthropic/OpenAI pricing changes.
 */
export const AI_PRICING = {
  "claude-sonnet": { input: 3, output: 15 },
  "claude-haiku": { input: 0.25, output: 1.25 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  default: { input: 3, output: 15 },
} as const;

export type AiModelKey = keyof typeof AI_PRICING;

export function estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
  const pricing = AI_PRICING[model as AiModelKey] ?? AI_PRICING.default;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
