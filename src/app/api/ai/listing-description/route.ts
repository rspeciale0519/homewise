import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { mlsId?: string; details?: string };

    let listingInfo = body.details ?? "";

    if (body.mlsId) {
      const listing = await prisma.listing.findUnique({ where: { mlsId: body.mlsId } });
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

    const result = await aiComplete({
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
    console.error("[ai/listing-description] error:", err);
    return NextResponse.json({ error: "Failed to generate descriptions" }, { status: 500 });
  }
}
