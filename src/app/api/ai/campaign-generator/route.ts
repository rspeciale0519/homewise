import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      campaignType: string;
      audience: string;
      emailCount?: number;
    };

    if (!body.campaignType || !body.audience) {
      return NextResponse.json({ error: "campaignType and audience required" }, { status: 400 });
    }

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

    const result = await aiComplete({
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
