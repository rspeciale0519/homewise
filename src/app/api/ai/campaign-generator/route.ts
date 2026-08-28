import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { aiCompleteForFeature } from "@/lib/ai";
import { reserveStaffFeature } from "@/lib/billing/require-feature";
import { InvalidJsonBodyError, readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { z } from "zod";

export const maxDuration = 60;

const campaignGeneratorSchema = z.object({
  campaignType: z.string().trim().min(1, "campaignType is required").max(120),
  audience: z.string().trim().min(1, "audience is required").max(4_000),
  emailCount: z.number().int().min(1).max(20).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await readJsonBodyWithLimit(request, 8_000);
    const input = campaignGeneratorSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;
    const emailCount = body.emailCount ?? 5;

    const prompt = `Generate a ${emailCount}-email drip campaign for:

Campaign Type: ${body.campaignType}
Target Audience: ${body.audience}

Create a complete email sequence with suggested delays. Use {{first_name}}, {{agent_name}}, {{site_url}} as personalization tokens.

Return JSON:
{
  "name": "<campaign name>",
  "emails": [
    {
      "subject": "<subject line>",
      "body": "<email HTML body>",
      "delayDays": <number>,
      "channel": "email"
    }
  ],
  "summary": "<brief campaign strategy description>"
}`;

    const entitlementError = await reserveStaffFeature(auth, "ai_email_content");
    if (entitlementError) return entitlementError;

    const result = await aiCompleteForFeature("campaign_generator", {
      feature: "campaign_generator",
      systemPrompt: "You are an email marketing specialist for real estate. Generate warm, professional drip campaigns. Output valid JSON only.",
      userMessage: prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    let parsed: Record<string, unknown>;
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { raw: result.content };
    } catch {
      parsed = { raw: result.content };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    if (err instanceof InvalidJsonBodyError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("[ai/campaign-generator] error:", err);
    return NextResponse.json({ error: "Failed to generate campaign" }, { status: 500 });
  }
}
