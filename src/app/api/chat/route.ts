import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { createPublicChatbot } from "@/lib/chatbot/public-site";
import { createAgentChatbot } from "@/lib/chatbot/agent-website";
import { createDashboardChatbot } from "@/lib/chatbot/dashboard";

export const maxDuration = 60;
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

async function findAgentIdForUser(userId: string, email?: string) {
  const matches = email ? [{ userId }, { email }] : [{ userId }];
  const agent = await prisma.agent.findFirst({
    where: { OR: matches },
    select: { id: true },
  });

  return agent?.id;
}

async function validateConversationAccess({
  conversationId,
  config,
  userId,
  agentId,
}: {
  conversationId: string;
  config: "agent" | "dashboard";
  userId: string;
  agentId?: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, config: true, userId: true, agentId: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (conversation.config !== config || conversation.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (agentId && conversation.agentId && conversation.agentId !== agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

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
    let authenticatedUserId: string | undefined;
    let authenticatedUserEmail: string | undefined;
    let authenticatedRole: string | undefined;

    if (config === "dashboard" || config === "agent") {
      const auth = await requireAuthApi();
      if (isError(auth)) return auth.error;
      authenticatedUserId = auth.user.id;
      authenticatedUserEmail = auth.user.email ?? undefined;
      authenticatedRole = auth.profile.role;
    }

    const sessionId = body.sessionId ?? crypto.randomUUID();

    let engine;

    switch (config) {
      case "agent": {
        if (!body.agentId) {
          return NextResponse.json({ error: "agentId required for agent config" }, { status: 400 });
        }
        if (!authenticatedUserId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const agent = await prisma.agent.findUnique({
          where: { id: body.agentId },
          select: { id: true, firstName: true, lastName: true, bio: true },
        });
        if (!agent) {
          return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const conversationError = body.conversationId
          ? await validateConversationAccess({
              conversationId: body.conversationId,
              config,
              userId: authenticatedUserId,
              agentId: agent.id,
            })
          : null;
        if (conversationError) return conversationError;

        engine = createAgentChatbot({
          agentId: agent.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentBio: agent.bio ?? undefined,
          sessionId,
          userId: authenticatedUserId,
        });
        break;
      }
      case "dashboard": {
        if (!authenticatedUserId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let scopedAgentId: string | undefined;
        if (authenticatedRole === "admin") {
          if (body.agentId) {
            const agent = await prisma.agent.findUnique({
              where: { id: body.agentId },
              select: { id: true },
            });

            if (!agent) {
              return NextResponse.json({ error: "Agent not found" }, { status: 404 });
            }

            scopedAgentId = agent.id;
          }
        } else {
          scopedAgentId = await findAgentIdForUser(authenticatedUserId, authenticatedUserEmail);
        }

        const conversationError = body.conversationId
          ? await validateConversationAccess({
              conversationId: body.conversationId,
              config,
              userId: authenticatedUserId,
              agentId: scopedAgentId,
            })
          : null;
        if (conversationError) return conversationError;

        engine = createDashboardChatbot(sessionId, authenticatedUserId, scopedAgentId);
        break;
      }
      default: {
        engine = createPublicChatbot(sessionId);
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
