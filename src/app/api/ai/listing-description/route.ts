import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiCompleteForFeature } from "@/lib/ai";
import { reserveStaffFeature } from "@/lib/billing/require-feature";
import { withIdx } from "@/lib/mls-visibility";
import { InvalidJsonBodyError, readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { z } from "zod";

export const maxDuration = 60;

const listingDescriptionSchema = z.object({
  mlsId: z.string().trim().min(1).max(100).optional(),
  details: z.string().trim().min(1).max(10_000).optional(),
}).strict().refine((data) => data.mlsId || data.details, {
  message: "Provide mlsId or details",
});

export async function POST(request: NextRequest) {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await readJsonBodyWithLimit(request, 12_000);
    const input = listingDescriptionSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;

    let listingInfo = body.details ?? "";

    if (body.mlsId) {
      const listing = await prisma.listing.findFirst({
        where: withIdx({ mlsId: body.mlsId }),
      });
      if (listing) {
        listingInfo = `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}
Type: ${listing.propertyType} | ${listing.beds}bd/${listing.baths}ba | ${listing.sqft} sqft
Year Built: ${listing.yearBuilt ?? "Unknown"} | Lot: ${listing.lotSize ? `${listing.lotSize} acres` : "Unknown"}
Pool: ${listing.hasPool ? "Yes" : "No"} | Waterfront: ${listing.hasWaterfront ? "Yes" : "No"} | Garage: ${listing.garageSpaces > 0 ? `${listing.garageSpaces}-car` : "No"}
Price: $${listing.price.toLocaleString()}
${listing.description ? `Current description: ${listing.description}` : ""}
${listing.subdivision ? `Subdivision: ${listing.subdivision}` : ""}`;
      }
    }

    if (!listingInfo) {
      return NextResponse.json({ error: "Provide mlsId or details" }, { status: 400 });
    }

    const prompt = `Generate 3 distinct listing descriptions for this property:

${listingInfo}

Create three variations:
1. **Lifestyle** - Focus on the lifestyle and living experience
2. **Features** - Highlight specific features and specifications
3. **Investment** - Focus on value, potential, and market positioning

Return JSON:
{
  "variations": [
    { "style": "Lifestyle", "description": "..." },
    { "style": "Features", "description": "..." },
    { "style": "Investment", "description": "..." }
  ]
}

Each description should be 150-250 words.`;

    const entitlementError = await reserveStaffFeature(auth, "ai_listing_descriptions");
    if (entitlementError) return entitlementError;

    const result = await aiCompleteForFeature("listing_description", {
      feature: "listing_description",
      systemPrompt: "You are a real estate copywriter. Write compelling listing descriptions. Output valid JSON only.",
      userMessage: prompt,
      maxTokens: 2000,
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
    console.error("[ai/listing-description] error:", err);
    return NextResponse.json({ error: "Failed to generate descriptions" }, { status: 500 });
  }
}
