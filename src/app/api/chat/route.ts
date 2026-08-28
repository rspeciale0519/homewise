import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi, requireStaffApi, isError } from "@/lib/admin-api";
import { createPublicChatbot } from "@/lib/chatbot/public-site";
import { createAgentChatbot } from "@/lib/chatbot/agent-website";
import { createDashboardChatbot } from "@/lib/chatbot/dashboard";
import {
  canAccessConversation,
  type ChatConfig,
  type ConversationAccessScope,
} from "@/lib/chatbot/conversation-access";
import {
  DistributedRateLimiter,
  type RateLimitRule,
} from "@/lib/rate-limit/distributed";
import { prisma } from "@/lib/prisma";
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import { trustedClientIp } from "@/lib/trusted-client";

export const maxDuration = 60;

const PUBLIC_SESSION_COOKIE = "homewise_public_chat";
const PUBLIC_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const MESSAGE_MAX_LENGTH = 4_000;
const IDENTIFIER_MAX_LENGTH = 128;
const SESSION_REQUEST_LIMIT = 20;
const IP_REQUEST_LIMIT = 60;
const MAX_REQUEST_BYTES = 10_000;
const chatRequestRateLimiter = new DistributedRateLimiter({
  windowMs: 60_000,
  maxBuckets: 10_000,
  namespace: "chat",
});

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(IDENTIFIER_MAX_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid identifier");

const chatSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(MESSAGE_MAX_LENGTH),
  conversationId: identifierSchema.optional(),
  config: z.enum(["public", "agent", "dashboard"]).optional(),
  sessionId: identifierSchema.optional(),
  agentId: identifierSchema.optional(),
}).strict();

type ChatBody = z.infer<typeof chatSchema>;

async function validateConversationAccess(
  conversationId: string,
  scope: ConversationAccessScope,
): Promise<NextResponse | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      config: true,
      sessionId: true,
      userId: true,
      agentId: true,
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (!canAccessConversation(conversation, scope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

function resolvePublicSession(
  request: NextRequest,
  body: ChatBody,
): { sessionId: string } | { error: NextResponse } {
  const cookieValue = request.cookies.get(PUBLIC_SESSION_COOKIE)?.value;
  const cookieSession = identifierSchema.safeParse(cookieValue);

  if (cookieSession.success) {
    return { sessionId: cookieSession.data };
  }

  if (body.conversationId) {
    if (!body.sessionId) {
      return {
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return { sessionId: body.sessionId };
  }

  return { sessionId: crypto.randomUUID() };
}

function setPublicSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: PUBLIC_SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PUBLIC_SESSION_COOKIE_MAX_AGE,
  });
}

async function getRateLimitResponse(
  request: NextRequest,
  config: ChatConfig,
  principalId: string,
): Promise<NextResponse | null> {
  const principalType = config === "public" ? "session" : "user";
  const rules: RateLimitRule[] = [
    { key: `${principalType}:${config}:${principalId}`, limit: SESSION_REQUEST_LIMIT },
  ];
  const clientIp = trustedClientIp(request);
  if (config === "public" && process.env.VERCEL === "1" && !clientIp) {
    return NextResponse.json(
      { error: "The chat service is temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  }
  if (clientIp) rules.push({ key: `ip:${clientIp}`, limit: IP_REQUEST_LIMIT });

  const result = await chatRequestRateLimiter.consume(rules);
  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: result.unavailable
        ? "The chat service is temporarily unavailable. Please try again later."
        : "Too many chat requests. Please try again later.",
    },
    {
      status: result.unavailable ? 503 : 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await readJsonBodyWithLimit(request, MAX_REQUEST_BYTES);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const input = chatSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;
    const config: ChatConfig = body.config ?? "public";
    const publicSession =
      config === "public" ? resolvePublicSession(request, body) : null;
    if (publicSession && "error" in publicSession) return publicSession.error;

    const sessionId = publicSession?.sessionId ?? body.sessionId ?? crypto.randomUUID();

    let engine;

    switch (config) {
      case "agent": {
        const auth = await requireAuthApi();
        if (isError(auth)) return auth.error;

        const rateLimitResponse = await getRateLimitResponse(
          request,
          config,
          auth.user.id,
        );
        if (rateLimitResponse) return rateLimitResponse;

        if (!body.agentId) {
          return NextResponse.json(
            { error: "agentId required for agent config" },
            { status: 400 },
          );
        }

        const agent = await prisma.agent.findUnique({
          where: { id: body.agentId },
          select: { id: true, firstName: true, lastName: true, bio: true },
        });
        if (!agent) {
          return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const conversationError = body.conversationId
          ? await validateConversationAccess(body.conversationId, {
              config,
              sessionId,
              userId: auth.user.id,
              agentId: agent.id,
            })
          : null;
        if (conversationError) return conversationError;

        engine = createAgentChatbot({
          agentId: agent.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentBio: agent.bio ?? undefined,
          sessionId,
          userId: auth.user.id,
        });
        break;
      }
      case "dashboard": {
        const auth = await requireStaffApi();
        if (isError(auth)) return auth.error;

        const rateLimitResponse = await getRateLimitResponse(
          request,
          config,
          auth.user.id,
        );
        if (rateLimitResponse) return rateLimitResponse;

        let scopedAgentId: string | undefined;
        if (auth.isAdmin) {
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
          scopedAgentId = auth.agentId ?? undefined;
        }

        const conversationError = body.conversationId
          ? await validateConversationAccess(body.conversationId, {
              config,
              sessionId,
              userId: auth.user.id,
              agentId: scopedAgentId,
            })
          : null;
        if (conversationError) return conversationError;

        engine = createDashboardChatbot(sessionId, auth.user.id, scopedAgentId);
        break;
      }
      default: {
        const rateLimitResponse = await getRateLimitResponse(
          request,
          config,
          sessionId,
        );
        if (rateLimitResponse) {
          if (!body.conversationId) {
            setPublicSessionCookie(rateLimitResponse, sessionId);
          }
          return rateLimitResponse;
        }

        const conversationError = body.conversationId
          ? await validateConversationAccess(body.conversationId, {
              config,
              sessionId,
            })
          : null;
        if (conversationError) return conversationError;

        engine = createPublicChatbot(sessionId);
      }
    }

    const chatResponse = await engine.chat({
      message: body.message,
      conversationId: body.conversationId,
    });
    const response = NextResponse.json(chatResponse);

    if (config === "public") setPublicSessionCookie(response, sessionId);
    return response;
  } catch (err) {
    console.error("[chat] error:", err);
    return NextResponse.json(
      { error: "Chat failed. Please try again." },
      { status: 500 },
    );
  }
}
