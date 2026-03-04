import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      type: "listing" | "market_update" | "engagement";
      mlsId?: string;
      topic?: string;
      platform?: string;
    };

    const platform = body.platform ?? "instagram";
    let context = "";

    if (body.type === "listing" && body.mlsId) {
      const listing = await prisma.listing.findUnique({
        where: { mlsId: body.mlsId },
        select: {
          address: true, city: true, price: true, beds: true, baths: true,
          sqft: true, propertyType: true, hasPool: true, hasWaterfront: true,
          description: true, photos: true,
        },
      });
      if (listing) {
        context = `Listing: ${listing.address}, ${listing.city}
$${listing.price.toLocaleString()} | ${listing.beds}bd/${listing.baths}ba | ${listing.sqft}sqft
${listing.hasPool ? "Pool" : ""} ${listing.hasWaterfront ? "Waterfront" : ""}
${listing.description?.slice(0, 200) ?? ""}
Photos available: ${listing.photos.length}`;
      }
    } else if (body.topic) {
      context = `Topic: ${body.topic}`;
    }

    const prompt = `Generate social media post variations for ${platform}:

Type: ${body.type}
${context}

Create 3 post variations with hashtags. Format for ${platform}.

Return JSON:
{
  "posts": [
    {
      "caption": "<post text with line breaks>",
      "hashtags": ["#tag1", "#tag2"],
      "photoSuggestion": "<which photo to use or content suggestion>"
    }
  ]
}`;

    const result = await aiComplete({
      feature: "social_post",
      systemPrompt: `You are a real estate social media expert. Write engaging ${platform} posts. Output valid JSON only.`,
      userMessage: prompt,
      maxTokens: 1500,
      temperature: 0.8,
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
    console.error("[ai/social-post] error:", err);
    return NextResponse.json({ error: "Failed to generate posts" }, { status: 500 });
  }
}
