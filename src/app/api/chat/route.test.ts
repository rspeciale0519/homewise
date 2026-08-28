import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAuthApiMock,
  requireStaffApiMock,
  conversationFindUniqueMock,
  agentFindUniqueMock,
  createPublicChatbotMock,
  createAgentChatbotMock,
  createDashboardChatbotMock,
  publicChatMock,
  agentChatMock,
  dashboardChatMock,
  rateLimitConsumeMock,
} = vi.hoisted(() => ({
  requireAuthApiMock: vi.fn(),
  requireStaffApiMock: vi.fn(),
  conversationFindUniqueMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  createPublicChatbotMock: vi.fn(),
  createAgentChatbotMock: vi.fn(),
  createDashboardChatbotMock: vi.fn(),
  publicChatMock: vi.fn(),
  agentChatMock: vi.fn(),
  dashboardChatMock: vi.fn(),
  rateLimitConsumeMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAuthApi: requireAuthApiMock,
  requireStaffApi: requireStaffApiMock,
  isError: (result: object) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: { findUnique: conversationFindUniqueMock },
    agent: { findUnique: agentFindUniqueMock },
  },
}));

vi.mock("@/lib/chatbot/public-site", () => ({
  createPublicChatbot: createPublicChatbotMock,
}));

vi.mock("@/lib/chatbot/agent-website", () => ({
  createAgentChatbot: createAgentChatbotMock,
}));

vi.mock("@/lib/chatbot/dashboard", () => ({
  createDashboardChatbot: createDashboardChatbotMock,
}));

vi.mock("@/lib/rate-limit/distributed", () => ({
  DistributedRateLimiter: class DistributedRateLimiterMock {
    consume = rateLimitConsumeMock;
  },
}));

import { POST } from "./route";

const PUBLIC_COOKIE = "homewise_public_chat";
const originalVercel = process.env.VERCEL;

function request(
  body: unknown,
  options: { cookie?: string; ip?: string } = {},
): NextRequest {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.cookie) headers.set("Cookie", `${PUBLIC_COOKIE}=${options.cookie}`);
  if (options.ip) headers.set("x-vercel-forwarded-for", options.ip);

  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitConsumeMock.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  requireAuthApiMock.mockResolvedValue({
    user: { id: "user-1" },
    profile: { role: "user" },
  });
  requireStaffApiMock.mockResolvedValue({
    user: { id: "staff-1" },
    profile: { role: "agent" },
    isAdmin: false,
    agentId: "agent-1",
  });
  agentFindUniqueMock.mockResolvedValue({
    id: "agent-1",
    firstName: "Avery",
    lastName: "Agent",
    bio: null,
  });
  publicChatMock.mockResolvedValue({ conversationId: "conversation-1", content: "Public reply" });
  agentChatMock.mockResolvedValue({ conversationId: "conversation-1", content: "Agent reply" });
  dashboardChatMock.mockResolvedValue({ conversationId: "conversation-1", content: "Dashboard reply" });
  createPublicChatbotMock.mockReturnValue({ chat: publicChatMock });
  createAgentChatbotMock.mockReturnValue({ chat: agentChatMock });
  createDashboardChatbotMock.mockReturnValue({ chat: dashboardChatMock });
});

afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
});

describe("POST /api/chat", () => {
  it("rejects a conversation from another chat config", async () => {
    conversationFindUniqueMock.mockResolvedValue({
      id: "conversation-1",
      config: "agent",
      sessionId: "session-a",
      userId: "user-1",
      agentId: "agent-1",
    });

    const response = await POST(request(
      { message: "Hello", conversationId: "conversation-1", config: "public" },
      { cookie: "session-a" },
    ));

    expect(response.status).toBe(403);
    expect(createPublicChatbotMock).not.toHaveBeenCalled();
  });

  it("rejects a public conversation bound to another cookie session", async () => {
    conversationFindUniqueMock.mockResolvedValue({
      id: "conversation-1",
      config: "public",
      sessionId: "session-b",
      userId: null,
      agentId: null,
    });

    const response = await POST(request(
      { message: "Hello", conversationId: "conversation-1", config: "public" },
      { cookie: "session-a" },
    ));

    expect(response.status).toBe(403);
    expect(publicChatMock).not.toHaveBeenCalled();
  });

  it("adopts a matching legacy public session into an HttpOnly cookie", async () => {
    conversationFindUniqueMock.mockResolvedValue({
      id: "conversation-1",
      config: "public",
      sessionId: "legacy-session",
      userId: null,
      agentId: null,
    });

    const response = await POST(request({
      message: "Continue",
      conversationId: "conversation-1",
      config: "public",
      sessionId: "legacy-session",
    }));

    expect(response.status).toBe(200);
    expect(createPublicChatbotMock).toHaveBeenCalledWith("legacy-session");
    const cookie = response.headers.get("set-cookie")?.toLowerCase();
    expect(cookie).toContain(`${PUBLIC_COOKIE}=legacy-session`);
    expect(cookie).toContain("httponly");
    expect(cookie).toContain("samesite=lax");
  });

  it("rejects an agent conversation owned by another user", async () => {
    conversationFindUniqueMock.mockResolvedValue({
      id: "conversation-1",
      config: "agent",
      sessionId: "session-a",
      userId: "user-2",
      agentId: "agent-1",
    });

    const response = await POST(request({
      message: "Hello",
      conversationId: "conversation-1",
      config: "agent",
      sessionId: "session-a",
      agentId: "agent-1",
    }));

    expect(response.status).toBe(403);
    expect(agentChatMock).not.toHaveBeenCalled();
  });

  it("rejects a dashboard conversation with a different agent scope", async () => {
    conversationFindUniqueMock.mockResolvedValue({
      id: "conversation-1",
      config: "dashboard",
      sessionId: "session-a",
      userId: "staff-1",
      agentId: null,
    });

    const response = await POST(request({
      message: "Hello",
      conversationId: "conversation-1",
      config: "dashboard",
      sessionId: "session-a",
    }));

    expect(response.status).toBe(403);
    expect(dashboardChatMock).not.toHaveBeenCalled();
  });

  it("rejects oversized messages and identifiers before database access", async () => {
    const messageResponse = await POST(request({ message: "x".repeat(4_001) }));
    const identifierResponse = await POST(request({
      message: "Hello",
      conversationId: "x".repeat(129),
    }));

    expect(messageResponse.status).toBe(400);
    expect(identifierResponse.status).toBe(400);
    expect(conversationFindUniqueMock).not.toHaveBeenCalled();
    expect(createPublicChatbotMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the public session exceeds its request limit", async () => {
    rateLimitConsumeMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
    });

    const response = await POST(request(
      { message: "Hello", config: "public" },
      { cookie: "session-a" },
    ));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(rateLimitConsumeMock).toHaveBeenCalledWith([
      { key: "session:public:session-a", limit: 20 },
    ]);
    expect(publicChatMock).not.toHaveBeenCalled();
  });

  it("returns 429 when a trusted Vercel address exceeds its request limit", async () => {
    process.env.VERCEL = "1";
    rateLimitConsumeMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
    });

    const response = await POST(request(
      { message: "Hello", config: "public" },
      { ip: "203.0.113.8" },
    ));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(rateLimitConsumeMock).toHaveBeenCalledWith(expect.arrayContaining([
      { key: "ip:203.0.113.8", limit: 60 },
    ]));
    expect(publicChatMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the shared limiter is unavailable", async () => {
    rateLimitConsumeMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 5,
      unavailable: true,
    });

    const response = await POST(request(
      { message: "Hello", config: "public" },
      { cookie: "session-a" },
    ));

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(publicChatMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated user as the agent chat limit key", async () => {
    const response = await POST(request({
      message: "Hello",
      config: "agent",
      agentId: "agent-1",
    }));

    expect(response.status).toBe(200);
    expect(rateLimitConsumeMock).toHaveBeenCalledWith([
      { key: "user:agent:user-1", limit: 20 },
    ]);
  });
});
