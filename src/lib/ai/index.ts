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
  feature,
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

export { anthropic };
