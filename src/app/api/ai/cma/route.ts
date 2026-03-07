import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";
import { z } from "zod";

const cmaSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  zip: z.string().min(1, "ZIP code is required"),
  beds: z.number().int().positive().optional(),
  baths: z.number().positive().optional(),
  sqft: z.number().int().positive().optional(),
  propertyType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await request.json();
    const input = cmaSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;

    const comps = await prisma.listing.findMany({
      where: {
        status: "Sold",
        zip: body.zip,
        ...(body.beds ? { beds: { gte: body.beds - 1, lte: body.beds + 1 } } : {}),
        ...(body.sqft ? { sqft: { gte: body.sqft - 500, lte: body.sqft + 500 } } : {}),
      },
      orderBy: { closeDate: "desc" },
      take: 8,
      select: {
        address: true, city: true, price: true, closePrice: true,
        beds: true, baths: true, sqft: true, yearBuilt: true,
        closeDate: true, daysOnMarket: true, lotSize: true,
        hasPool: true, hasGarage: true, garageSpaces: true,
      },
    });

    const activeComps = await prisma.listing.findMany({
      where: {
        status: "Active",
        zip: body.zip,
        ...(body.beds ? { beds: { gte: body.beds - 1, lte: body.beds + 1 } } : {}),
      },
      orderBy: { price: "asc" },
      take: 5,
      select: { address: true, city: true, price: true, beds: true, baths: true, sqft: true, daysOnMarket: true },
    });

    const soldPrices = comps.map((c) => c.closePrice ?? c.price).filter(Boolean);
    const avgSoldPrice = soldPrices.length > 0 ? soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length : 0;
    const avgDom = comps.length > 0 ? comps.reduce((a, c) => a + c.daysOnMarket, 0) / comps.length : 0;

    const compsText = comps.map((c) =>
      `${c.address}: ${c.beds}bd/${c.baths}ba, ${c.sqft}sqft, sold $${(c.closePrice ?? c.price).toLocaleString()}, ${c.daysOnMarket} DOM${c.hasPool ? ", pool" : ""}`,
    ).join("\n");

    const activeText = activeComps.map((c) =>
      `${c.address}: ${c.beds}bd/${c.baths}ba, ${c.sqft}sqft, listed $${c.price.toLocaleString()}, ${c.daysOnMarket} DOM`,
    ).join("\n");

    const prompt = `Generate a CMA (Comparative Market Analysis) report for:

Subject Property: ${body.address}, ${body.city}, ${body.zip}
Type: ${body.propertyType ?? "Single Family"}
Beds: ${body.beds ?? "Unknown"} | Baths: ${body.baths ?? "Unknown"} | Sqft: ${body.sqft ?? "Unknown"}

SOLD COMPARABLES (${comps.length}):
${compsText || "No sold comparables found"}

ACTIVE LISTINGS (${activeComps.length}):
${activeText || "No active comparables found"}

MARKET DATA:
Average Sold Price: $${Math.round(avgSoldPrice).toLocaleString()}
Average Days on Market: ${Math.round(avgDom)}

Generate a JSON response:
{
  "estimatedValue": { "low": <number>, "mid": <number>, "high": <number> },
  "pricingRecommendation": "<1-2 sentence recommendation>",
  "marketNarrative": "<3-4 paragraph market analysis>",
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"]
}`;

    const result = await aiComplete({
      feature: "cma_report",
      systemPrompt: "You are a real estate market analyst generating CMA reports. Be data-driven and specific. Output valid JSON only.",
      userMessage: prompt,
      maxTokens: 2000,
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
      comps: comps.map((c) => ({
        address: c.address, city: c.city,
        soldPrice: c.closePrice ?? c.price,
        beds: c.beds, baths: c.baths, sqft: c.sqft,
        dom: c.daysOnMarket, closeDate: c.closeDate?.toISOString() ?? null,
      })),
      activeComps: activeComps.map((c) => ({
        address: c.address, price: c.price,
        beds: c.beds, baths: c.baths, sqft: c.sqft, dom: c.daysOnMarket,
      })),
      subjectProperty: body,
    });
  } catch (err) {
    console.error("[ai/cma] error:", err);
    return NextResponse.json({ error: "Failed to generate CMA" }, { status: 500 });
  }
}
