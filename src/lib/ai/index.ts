import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestLog: number[] = [];

interface AiCompletionInput {
  feature: string;
  systemPrompt: string;
  userMessage: string;
  userId?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface AiCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
}

function checkRateLimit(): boolean {
  const now = Date.now();
  while (requestLog.length > 0 && requestLog[0]! < now - RATE_LIMIT_WINDOW_MS) {
    requestLog.shift();
  }
  return requestLog.length < RATE_LIMIT_MAX_REQUESTS;
}

export async function aiComplete({
  feature,
  systemPrompt,
  userMessage,
  userId,
  model = "claude-sonnet-4-20250514",
  maxTokens = 2048,
  temperature = 0.7,
}: AiCompletionInput): Promise<AiCompletionResult> {
  if (!checkRateLimit()) {
    throw new Error("AI rate limit exceeded. Please try again in a moment.");
  }

  const start = Date.now();
  requestLog.push(start);

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const latencyMs = Date.now() - start;
  const textContent = response.content.find((c) => c.type === "text");
  const content = textContent && "text" in textContent ? textContent.text : "";

  await prisma.aiUsageLog.create({
    data: {
      feature,
      userId: userId ?? null,
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cached: false,
      latencyMs,
    },
  }).catch(() => { /* non-critical */ });

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cached: false,
  };
}

export async function aiStream({
  systemPrompt,
  userMessage,
  model = "claude-sonnet-4-20250514",
  maxTokens = 2048,
  temperature = 0.7,
}: Omit<AiCompletionInput, "userId">) {
  if (!checkRateLimit()) {
    throw new Error("AI rate limit exceeded.");
  }

  requestLog.push(Date.now());

  return anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
}

// ---------------------------------------------------------------------------
// OpenAI completion (same interface as aiComplete)
// ---------------------------------------------------------------------------

async function openAiComplete({
  feature,
  systemPrompt,
  userMessage,
  userId,
  model,
  maxTokens = 2048,
  temperature = 0.7,
}: AiCompletionInput): Promise<AiCompletionResult> {
  if (!checkRateLimit()) {
    throw new Error("AI rate limit exceeded. Please try again in a moment.");
  }

  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

  const start = Date.now();
  requestLog.push(start);

  const response = await openai.chat.completions.create({
    model: model ?? "gpt-4o-mini",
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const latencyMs = Date.now() - start;
  const content = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  await prisma.aiUsageLog.create({
    data: { feature, userId: userId ?? null, model: model ?? "gpt-4o-mini", inputTokens, outputTokens, cached: false, latencyMs },
  }).catch(() => { /* non-critical */ });

  return { content, inputTokens, outputTokens, cached: false };
}

// ---------------------------------------------------------------------------
// Model cache — 5-minute TTL per feature key
// ---------------------------------------------------------------------------

const MODEL_CACHE = new Map<string, { model: string; expiresAt: number }>();
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_MODEL = "claude-sonnet-4-20250514";

export async function getModelForFeature(featureKey: string): Promise<string> {
  const cached = MODEL_CACHE.get(featureKey);
  if (cached && cached.expiresAt > Date.now()) return cached.model;

  const config = await prisma.aiFeatureConfig.findUnique({ where: { featureKey } }).catch(() => null);
  const model = config?.model ?? FALLBACK_MODEL;
  MODEL_CACHE.set(featureKey, { model, expiresAt: Date.now() + MODEL_CACHE_TTL_MS });
  return model;
}

export function invalidateModelCache(): void {
  MODEL_CACHE.clear();
}

// ---------------------------------------------------------------------------
// Unified dispatch — routes by model prefix
// ---------------------------------------------------------------------------

export async function aiCompleteForFeature(
  featureKey: string,
  opts: Omit<AiCompletionInput, "model">,
): Promise<AiCompletionResult> {
  const model = await getModelForFeature(featureKey);
  const isOpenAi = model.startsWith("gpt-") || model.startsWith("o1-") || model.startsWith("o3-") || model.startsWith("o4-");
  return isOpenAi
    ? openAiComplete({ ...opts, model, feature: featureKey })
    : aiComplete({ ...opts, model, feature: featureKey });
}

export { anthropic };
