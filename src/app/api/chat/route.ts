import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { createPublicChatbot } from "@/lib/chatbot/public-site";
import { createAgentChatbot } from "@/lib/chatbot/agent-website";
import { createDashboardChatbot } from "@/lib/chatbot/dashboard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
  config: z.enum(["public", "agent", "dashboard"]).optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  agentId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const raw: unknown = await request.json();
    const input = chatSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;
    const config = body.config ?? "public";

    if (config === "dashboard" || config === "agent") {
      const auth = await requireAuthApi();
      if (isError(auth)) return auth.error;
    }

    const sessionId = body.sessionId ?? crypto.randomUUID();

    let engine;

    switch (config) {
      case "agent": {
        if (!body.agentId) {
          return NextResponse.json({ error: "agentId required for agent config" }, { status: 400 });
        }
        const agent = await prisma.agent.findUnique({
          where: { id: body.agentId },
          select: { id: true, firstName: true, lastName: true, bio: true },
        });
        if (!agent) {
          return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }
        engine = createAgentChatbot({
          agentId: agent.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentBio: agent.bio ?? undefined,
          sessionId,
        });
        break;
      }
      case "dashboard": {
        if (!body.userId) {
          return NextResponse.json({ error: "userId required for dashboard config" }, { status: 400 });
        }
        engine = createDashboardChatbot(sessionId, body.userId, body.agentId);
        break;
      }
      default: {
        engine = createPublicChatbot(sessionId, body.userId);
      }
    }

    const response = await engine.chat({
      message: body.message,
      conversationId: body.conversationId,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("[chat] error:", err);
    return NextResponse.json(
      { error: "Chat failed. Please try again." },
      { status: 500 },
    );
  }
}
