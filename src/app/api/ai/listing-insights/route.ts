import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiCompleteForFeature } from "@/lib/ai";
import { reserveStaffFeature } from "@/lib/billing/require-feature";
import {
  InvalidJsonBodyError,
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import { withIdx } from "@/lib/mls-visibility";
import { z } from "zod";

export const maxDuration = 60;

const listingInsightsSchema = z.object({
  mlsId: z.string().trim().min(1, "mlsId is required").max(100),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  try {
    const raw = await readJsonBodyWithLimit(request, 2_000);
    const input = listingInsightsSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { mlsId } = input.data;

    const listing = await prisma.listing.findFirst({ where: withIdx({ mlsId }) });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const comparables = await prisma.listing.findMany({
      where: withIdx({
        city: listing.city,
        propertyType: listing.propertyType,
        status: "Active",
        id: { not: listing.id },
        beds: { gte: listing.beds - 1, lte: listing.beds + 1 },
      }),
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

    const entitlementError = await reserveStaffFeature(
      auth,
      "ai_listing_descriptions",
    );
    if (entitlementError) return entitlementError;

    const result = await aiCompleteForFeature("listing_insights", {
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
      listing: { mlsId: input.data.mlsId, address: listing.address, price: listing.price, dom: listing.daysOnMarket },
      comparableCount: comparables.length,
      avgCompPrice: Math.round(avgCompPrice),
      avgCompDom: Math.round(avgCompDom),
    });
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    if (err instanceof InvalidJsonBodyError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("[ai/listing-insights] error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
