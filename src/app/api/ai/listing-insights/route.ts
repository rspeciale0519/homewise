import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";
import { z } from "zod";

const listingInsightsSchema = z.object({
  mlsId: z.string().min(1, "mlsId is required"),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const input = listingInsightsSchema.safeParse(params);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", details: input.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { mlsId } = input.data;

  try {
    const listing = await prisma.listing.findUnique({ where: { mlsId } });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const comparables = await prisma.listing.findMany({
      where: {
        city: listing.city,
        propertyType: listing.propertyType,
        status: "Active",
        id: { not: listing.id },
        beds: { gte: listing.beds - 1, lte: listing.beds + 1 },
      },
      select: { price: true, daysOnMarket: true, sqft: true },
      take: 10,
    });

    const avgCompPrice = comparables.length > 0
      ? comparables.reduce((a, c) => a + c.price, 0) / comparables.length : 0;
    const avgCompDom = comparables.length > 0
      ? comparables.reduce((a, c) => a + c.daysOnMarket, 0) / comparables.length : 0;

    const prompt = `Analyze this listing's performance:

Listing: ${listing.address}, ${listing.city}
Price: $${listing.price.toLocaleString()} | DOM: ${listing.daysOnMarket}
${listing.beds}bd/${listing.baths}ba | ${listing.sqft}sqft

Market comparison (${comparables.length} similar active listings):
Avg Price: $${Math.round(avgCompPrice).toLocaleString()}
Avg DOM: ${Math.round(avgCompDom)} days

Generate JSON:
{
  "performanceSummary": "<2-sentence performance summary>",
  "pricePosition": "<above/at/below market>",
  "suggestions": ["<action 1>", "<action 2>"],
  "marketContext": "<brief market context>"
}`;

    const result = await aiComplete({
      feature: "listing_insights",
      systemPrompt: "You are a real estate listing performance analyst. Output valid JSON only.",
      userMessage: prompt,
      maxTokens: 500,
      temperature: 0.4,
    });

    let parsed: Record<string, unknown>;
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { raw: result.content };
    } catch {
      parsed = { raw: result.content };
    }

    return NextResponse.json({
      ...parsed,
      listing: { mlsId, address: listing.address, price: listing.price, dom: listing.daysOnMarket },
      comparableCount: comparables.length,
      avgCompPrice: Math.round(avgCompPrice),
      avgCompDom: Math.round(avgCompDom),
    });
  } catch (err) {
    console.error("[ai/listing-insights] error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
