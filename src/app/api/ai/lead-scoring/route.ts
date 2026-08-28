import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiCompleteForFeature } from "@/lib/ai";
import { reserveStaffFeature } from "@/lib/billing/require-feature";
import { parseLeadScoringResult } from "@/lib/ai/lead-scoring-result";
import { InvalidJsonBodyError, readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { z } from "zod";

export const maxDuration = 60;

const leadScoringSchema = z.object({
  contactId: z.string().trim().min(1, "contactId is required").max(100),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await readJsonBodyWithLimit(request, 2_000);
    const input = leadScoringSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;

    const contact = await prisma.contact.findFirst({
      where: auth.isAdmin
        ? { id: body.contactId }
        : { id: body.contactId, assignedAgentId: auth.agentId ?? undefined },
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

    const entitlementError = await reserveStaffFeature(auth, "ai_lead_scoring");
    if (entitlementError) return entitlementError;

    const result = await aiCompleteForFeature("lead_scoring", {
      feature: "lead_scoring",
      systemPrompt: "You are a real estate CRM analyst. Score leads based on engagement, recency, and buying signals. Output valid JSON only.",
      userMessage: prompt,
      maxTokens: 300,
      temperature: 0.3,
    });

    const parsed = parseLeadScoringResult(result.content, contact.score);

    await prisma.contact.update({
      where: { id: contact.id },
      data: { score: parsed.score },
    });

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    if (err instanceof InvalidJsonBodyError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("[ai/lead-scoring] error:", err);
    return NextResponse.json({ error: "Failed to score lead" }, { status: 500 });
  }
}
