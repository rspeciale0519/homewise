import { NextRequest, NextResponse } from "next/server";
import { createPublicChatbot } from "@/lib/chatbot/public-site";
import { createAgentChatbot } from "@/lib/chatbot/agent-website";
import { createDashboardChatbot } from "@/lib/chatbot/dashboard";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message: string;
      conversationId?: string;
      config?: "public" | "agent" | "dashboard";
      sessionId?: string;
      userId?: string;
      agentId?: string;
    };

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const sessionId = body.sessionId ?? crypto.randomUUID();
    const config = body.config ?? "public";

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
