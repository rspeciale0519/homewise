import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiCompleteForFeature } from "@/lib/ai";
import { z } from "zod";

export const maxDuration = 60;

const homeValuationSchema = z.object({
  evaluationId: z.string().min(1, "evaluationId is required"),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await request.json();
    const input = homeValuationSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;

    const evaluation = await prisma.homeEvaluation.findUnique({
      where: { id: body.evaluationId },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // Pull comparable sold listings
    const comps = await prisma.listing.findMany({
      where: {
        status: "Sold",
        zip: evaluation.zip,
        ...(evaluation.bedrooms ? { beds: { gte: evaluation.bedrooms - 1, lte: evaluation.bedrooms + 1 } } : {}),
        ...(evaluation.sqft ? { sqft: { gte: evaluation.sqft - 500, lte: evaluation.sqft + 500 } } : {}),
      },
      orderBy: { closeDate: "desc" },
      take: 8,
      select: {
        address: true, city: true, price: true, closePrice: true, beds: true, baths: true,
        sqft: true, yearBuilt: true, closeDate: true, daysOnMarket: true,
      },
    });

    const compsText = comps.map((c) =>
      `${c.address}, ${c.city}: ${c.beds}bd/${c.baths}ba, ${c.sqft}sqft, sold $${(c.closePrice ?? c.price).toLocaleString()}${c.closeDate ? ` on ${c.closeDate.toLocaleDateString()}` : ""}, ${c.daysOnMarket} DOM`,
    ).join("\n");

    const prompt = `Generate a personalized home valuation narrative for:

Property: ${evaluation.streetAddress}, ${evaluation.city}, ${evaluation.state} ${evaluation.zip}
Type: ${evaluation.propertyType ?? "Single Family"}
Bedrooms: ${evaluation.bedrooms ?? "Unknown"} | Bathrooms: ${evaluation.bathrooms ?? "Unknown"} | Sqft: ${evaluation.sqft ?? "Unknown"}

Recent comparable sales in the area:
${compsText || "No recent comparable sales found."}

Write a professional, warm narrative (3-4 paragraphs) that:
1. Acknowledges the homeowner's property
2. Analyzes the comparable sales data and market trends
3. Provides an estimated value range (if comps exist)
4. Encourages them to contact us for a detailed analysis

Do NOT include any disclaimers about being AI. Write as a real estate professional.`;

    const result = await aiCompleteForFeature("home_valuation", {
      feature: "home_valuation",
      systemPrompt: "You are a real estate market analyst writing home valuation narratives for Homewise FL. Be data-driven but warm and personal.",
      userMessage: prompt,
      maxTokens: 1500,
    });

    return NextResponse.json({
      narrative: result.content,
      compsCount: comps.length,
      evaluationId: evaluation.id,
    });
  } catch (err) {
    console.error("[ai/home-valuation] error:", err);
    return NextResponse.json({ error: "Failed to generate valuation" }, { status: 500 });
  }
}
