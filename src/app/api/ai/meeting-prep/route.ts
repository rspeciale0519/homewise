import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { contactId: string; propertyId?: string };

    const contact = await prisma.contact.findUnique({
      where: { id: body.contactId },
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        tags: { include: { tag: true } },
      },
    });

    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    let propertyInfo = "";
    if (body.propertyId) {
      const listing = await prisma.listing.findUnique({
        where: { id: body.propertyId },
        select: {
          address: true, city: true, price: true, beds: true, baths: true,
          sqft: true, yearBuilt: true, propertyType: true, daysOnMarket: true,
          walkScore: true, schoolDistrict: true, description: true,
        },
      });
      if (listing) {
        propertyInfo = `\nShowing Property: ${listing.address}, ${listing.city}
$${listing.price.toLocaleString()} | ${listing.beds}bd/${listing.baths}ba | ${listing.sqft}sqft
Built ${listing.yearBuilt ?? "Unknown"} | ${listing.daysOnMarket} DOM
Walk Score: ${listing.walkScore ?? "N/A"} | School District: ${listing.schoolDistrict ?? "N/A"}`;
      }
    }

    // Get comparable listings for talking points
    const comps = body.propertyId ? await prisma.listing.findMany({
      where: { status: { in: ["Active", "Sold"] }, city: { equals: contact.activities[0]?.description?.split(",")[1]?.trim() ?? "" } },
      select: { address: true, price: true, beds: true, baths: true, sqft: true, status: true },
      take: 5,
    }) : [];

    const activitySummary = contact.activities.slice(0, 10).map((a) =>
      `${a.type}: ${a.title}${a.description ? ` - ${a.description}` : ""}`,
    ).join("\n");

    const prompt = `Generate a meeting prep brief for:

Client: ${contact.firstName} ${contact.lastName}
Type: ${contact.type} | Stage: ${contact.stage}
Tags: ${contact.tags.map((t) => t.tag.name).join(", ") || "none"}
${propertyInfo}

Recent Activity:
${activitySummary || "No recent activity"}

${comps.length > 0 ? `Nearby Comparables:\n${comps.map((c) => `${c.address}: $${c.price.toLocaleString()} (${c.status})`).join("\n")}` : ""}

Generate a JSON meeting prep brief:
{
  "clientSummary": "<1-2 sentence client overview>",
  "searchHistory": "<summary of what they've been looking at>",
  "talkingPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "neighborhoodInsights": "<relevant area info>",
  "suggestedQuestions": ["<question to ask client>", "<question 2>"],
  "competitiveContext": "<market position of the property>"
}`;

    const result = await aiComplete({
      feature: "meeting_prep",
      systemPrompt: "You are a real estate agent's preparation assistant. Create concise, actionable meeting briefs. Output valid JSON only.",
      userMessage: prompt,
      maxTokens: 1500,
      temperature: 0.5,
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
    console.error("[ai/meeting-prep] error:", err);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}
