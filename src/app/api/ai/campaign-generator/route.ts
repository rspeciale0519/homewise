import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { aiCompleteForFeature } from "@/lib/ai";
import { z } from "zod";

export const maxDuration = 60;

const campaignGeneratorSchema = z.object({
  campaignType: z.string().min(1, "campaignType is required"),
  audience: z.string().min(1, "audience is required"),
  emailCount: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await request.json();
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
    console.error("[ai/campaign-generator] error:", err);
    return NextResponse.json({ error: "Failed to generate campaign" }, { status: 500 });
  }
}
