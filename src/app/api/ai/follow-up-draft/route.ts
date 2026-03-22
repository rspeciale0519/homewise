import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { aiCompleteForFeature } from "@/lib/ai";
import { z } from "zod";

export const maxDuration = 60;

const followUpSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
  channel: z.enum(["email", "sms"]).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  try {
    const raw: unknown = await request.json();
    const input = followUpSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;
    const channel = body.channel ?? "email";

    const contact = await prisma.contact.findUnique({
      where: { id: body.contactId },
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: 15 },
        assignedAgent: { select: { firstName: true, lastName: true } },
      },
    });

    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const agentName = contact.assignedAgent
      ? `${contact.assignedAgent.firstName} ${contact.assignedAgent.lastName}`
      : "Your Homewise Agent";

    const activitySummary = contact.activities.map((a) =>
      `[${a.createdAt.toLocaleDateString()}] ${a.type}: ${a.title}${a.description ? ` - ${a.description}` : ""}`,
    ).join("\n");

    const prompt = `Draft a personalized ${channel === "sms" ? "text message" : "follow-up email"} for this real estate lead:

Contact: ${contact.firstName} ${contact.lastName}
Type: ${contact.type} | Stage: ${contact.stage}
Source: ${contact.source}
Agent: ${agentName}

Recent Activity:
${activitySummary || "No recent activity recorded"}

${channel === "email" ? `Generate a JSON response with:
{
  "subject": "<email subject line>",
  "body": "<email body - warm, personalized, references their activity>"
}` : `Generate a JSON response with:
{
  "body": "<SMS text - max 160 chars, casual but professional>"
}`}

Reference specific listings or activities they've engaged with. Be warm and personal.`;

    const result = await aiCompleteForFeature("follow_up_draft", {
      feature: "follow_up_draft",
      systemPrompt: `You are a real estate agent's writing assistant. Write personalized ${channel === "sms" ? "text messages" : "emails"} that reference the lead's specific activity. Be warm, not salesy. Output valid JSON only.`,
      userMessage: prompt,
      maxTokens: 500,
      temperature: 0.7,
    });

    let parsed: Record<string, string>;
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { body: "Unable to generate draft." };
    } catch {
      parsed = { body: result.content };
    }

    return NextResponse.json({ channel, ...parsed });
  } catch (err) {
    console.error("[ai/follow-up-draft] error:", err);
    return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
  }
}
