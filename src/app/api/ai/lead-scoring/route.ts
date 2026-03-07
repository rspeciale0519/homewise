import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";
import { z } from "zod";

const leadScoringSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await request.json();
    const input = leadScoringSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;

    const contact = await prisma.contact.findUnique({
      where: { id: body.contactId },
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        tags: { include: { tag: true } },
        tasks: { where: { completedAt: null }, take: 5 },
      },
    });

    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const activitySummary = contact.activities.map((a) =>
      `[${a.createdAt.toLocaleDateString()}] ${a.type}: ${a.title}`,
    ).join("\n");

    const tagNames = contact.tags.map((t) => t.tag.name).join(", ");

    const prompt = `Analyze this real estate lead and generate a 2-sentence priority brief:

Contact: ${contact.firstName} ${contact.lastName}
Type: ${contact.type} | Stage: ${contact.stage} | Current Score: ${contact.score}
Tags: ${tagNames || "none"}
Source: ${contact.source}
Created: ${contact.createdAt.toLocaleDateString()}

Recent Activity:
${activitySummary || "No recent activity"}

Pending Tasks: ${contact.tasks.length}

Generate a JSON response:
{
  "score": <number 0-100 based on engagement and buying signals>,
  "brief": "<2-sentence priority assessment>",
  "suggestedAction": "<recommended next step>"
}`;

    const result = await aiComplete({
      feature: "lead_scoring",
      systemPrompt: "You are a real estate CRM analyst. Score leads based on engagement, recency, and buying signals. Output valid JSON only.",
      userMessage: prompt,
      maxTokens: 300,
      temperature: 0.3,
    });

    let parsed: { score: number; brief: string; suggestedAction: string };
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { score: contact.score, brief: "Unable to generate brief.", suggestedAction: "Review manually." };
    } catch {
      parsed = { score: contact.score, brief: "Unable to generate brief.", suggestedAction: "Review manually." };
    }

    await prisma.contact.update({
      where: { id: contact.id },
      data: { score: parsed.score },
    });

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[ai/lead-scoring] error:", err);
    return NextResponse.json({ error: "Failed to score lead" }, { status: 500 });
  }
}
