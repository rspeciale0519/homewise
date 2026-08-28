import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiCompleteForFeature } from "@/lib/ai";
import { reserveStaffFeature } from "@/lib/billing/require-feature";
import { withIdx } from "@/lib/mls-visibility";
import { InvalidJsonBodyError, readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { z } from "zod";

export const maxDuration = 60;

const socialPostSchema = z.object({
  type: z.enum(["listing", "market_update", "engagement"]),
  mlsId: z.string().trim().min(1).max(100).optional(),
  topic: z.string().trim().min(1).max(2_000).optional(),
  platform: z.enum(["instagram", "facebook", "linkedin", "x"]).optional(),
}).strict().superRefine((value, context) => {
  if (value.type === "listing" && !value.mlsId) {
    context.addIssue({ code: "custom", path: ["mlsId"], message: "mlsId is required" });
  }
  if (value.type !== "listing" && !value.topic) {
    context.addIssue({ code: "custom", path: ["topic"], message: "topic is required" });
  }
});

export async function POST(request: NextRequest) {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await readJsonBodyWithLimit(request, 5_000);
    const input = socialPostSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;
    const platform = body.platform ?? "instagram";
    let context = "";

    if (body.type === "listing" && body.mlsId) {
      const listing = await prisma.listing.findFirst({
        where: withIdx({ mlsId: body.mlsId }),
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

    const entitlementError = await reserveStaffFeature(auth, "ai_social_posts");
    if (entitlementError) return entitlementError;

    const result = await aiCompleteForFeature("social_post", {
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
    if (err instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    if (err instanceof InvalidJsonBodyError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("[ai/social-post] error:", err);
    return NextResponse.json({ error: "Failed to generate posts" }, { status: 500 });
  }
}
