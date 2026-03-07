import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";
import { z } from "zod";

export const maxDuration = 60;

const marketInsightsSchema = z.object({
  city: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const input = marketInsightsSchema.safeParse(params);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", details: input.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const city = input.data.city ?? "Orlando";

  try {
    const [activeListings, soldListings, avgPrice, medianDom] = await Promise.all([
      prisma.listing.count({ where: { city: { equals: city, mode: "insensitive" }, status: "Active" } }),
      prisma.listing.count({
        where: { city: { equals: city, mode: "insensitive" }, status: "Sold", closeDate: { gte: new Date(Date.now() - 90 * 86400000) } },
      }),
      prisma.listing.aggregate({
        where: { city: { equals: city, mode: "insensitive" }, status: "Active" },
        _avg: { price: true },
      }),
      prisma.listing.aggregate({
        where: { city: { equals: city, mode: "insensitive" }, status: "Active" },
        _avg: { daysOnMarket: true },
      }),
    ]);

    const stats = {
      city,
      activeListings,
      soldLast90Days: soldListings,
      avgPrice: Math.round(avgPrice._avg.price ?? 0),
      avgDaysOnMarket: Math.round(medianDom._avg.daysOnMarket ?? 0),
    };

    const prompt = `Generate a brief market insight (2-3 sentences) for ${city}, FL:
- Active listings: ${stats.activeListings}
- Sold last 90 days: ${stats.soldLast90Days}
- Average listing price: $${stats.avgPrice.toLocaleString()}
- Average days on market: ${stats.avgDaysOnMarket}

Make it informative and include a subtle call to action to work with a local agent.`;

    const result = await aiComplete({
      feature: "market_insights",
      systemPrompt: "You are a real estate market analyst for Central Florida. Write concise, data-driven insights. No disclaimers.",
      userMessage: prompt,
      maxTokens: 300,
      temperature: 0.6,
    });

    return NextResponse.json({
      ...stats,
      insight: result.content,
    });
  } catch (err) {
    console.error("[ai/market-insights] error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
