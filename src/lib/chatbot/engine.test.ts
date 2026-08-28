import type Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  messagesCreateMock,
  getModelForFeatureMock,
  conversationFindUniqueMock,
  conversationCreateMock,
  chatMessageCreateMock,
  chatMessageFindManyMock,
} = vi.hoisted(() => ({
  messagesCreateMock: vi.fn(),
  getModelForFeatureMock: vi.fn(),
  conversationFindUniqueMock: vi.fn(),
  conversationCreateMock: vi.fn(),
  chatMessageCreateMock: vi.fn(),
  chatMessageFindManyMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: messagesCreateMock };
  },
}));

vi.mock("@/lib/ai", () => ({
  getModelForFeature: getModelForFeatureMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: conversationFindUniqueMock,
      create: conversationCreateMock,
    },
    chatMessage: {
      create: chatMessageCreateMock,
      findMany: chatMessageFindManyMock,
    },
  },
}));

import {
  ChatbotEngine,
  MAX_TOOL_ROUNDS,
  type ContextBundle,
} from "./engine";

const safeTool: Anthropic.Tool = {
  name: "safe_tool",
  description: "Read safe data",
  input_schema: { type: "object", properties: {} },
};

const scheduleContactTool: Anthropic.Tool = {
  name: "schedule_contact",
  description: "Write a CRM contact",
  input_schema: { type: "object", properties: {} },
};

function context(overrides: Partial<ContextBundle> = {}): ContextBundle {
  return {
    config: "public",
    systemPrompt: "System prompt",
    tools: [],
    sessionId: "session-a",
    ...overrides,
  };
}

function textResponse(text: string) {
  return {
    stop_reason: "end_turn",
    content: [{ type: "text", text }],
    usage: { output_tokens: 5 },
  };
}

function toolResponse(name: string, id: string) {
  return {
    stop_reason: "tool_use",
    content: [{ type: "tool_use", id, name, input: {} }],
    usage: { output_tokens: 1 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getModelForFeatureMock.mockResolvedValue("claude-test-model");
  conversationFindUniqueMock.mockResolvedValue({
    config: "public",
    sessionId: "session-a",
    userId: null,
    agentId: null,
  });
  conversationCreateMock.mockResolvedValue({ id: "conversation-1" });
  chatMessageCreateMock.mockResolvedValue({ id: "message-1" });
  chatMessageFindManyMock.mockResolvedValue([]);
  messagesCreateMock.mockResolvedValue(textResponse("Done"));
});

describe("ChatbotEngine", () => {
  it("loads the newest 50 messages and restores chronological model order", async () => {
    chatMessageFindManyMock.mockResolvedValue([
      { id: "message-3", role: "assistant", content: "Newest" },
      { id: "message-2", role: "user", content: "Middle" },
      { id: "message-1", role: "assistant", content: "Oldest" },
    ]);
    const engine = new ChatbotEngine(context());

    await engine.chat({ message: "Current", conversationId: "conversation-1" });

    expect(chatMessageFindManyMock).toHaveBeenCalledWith({
      where: { conversationId: "conversation-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    });
    const modelRequest = messagesCreateMock.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(modelRequest.messages).toEqual([
      { role: "assistant", content: "Oldest" },
      { role: "user", content: "Middle" },
      { role: "assistant", content: "Newest" },
    ]);
  });

  it("stops after the hard tool-round limit", async () => {
    messagesCreateMock.mockImplementation(() =>
      Promise.resolve(toolResponse("safe_tool", crypto.randomUUID())),
    );
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const engine = new ChatbotEngine(context({ tools: [safeTool] }));
    engine.registerTool("safe_tool", handler);

    const response = await engine.chat({
      message: "Keep using tools",
      conversationId: "conversation-1",
    });

    expect(handler).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(messagesCreateMock).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
    expect(response.content).toBe(
      "I could not complete this request safely. Please try a simpler request.",
    );
  });

  it("does not expose or execute the agent CRM mutation tool", async () => {
    conversationFindUniqueMock.mockResolvedValue({
      config: "agent",
      sessionId: "session-a",
      userId: "user-1",
      agentId: "agent-1",
    });
    messagesCreateMock
      .mockResolvedValueOnce(toolResponse("schedule_contact", "tool-1"))
      .mockResolvedValueOnce(textResponse("Use the contact form."));
    const handler = vi.fn().mockResolvedValue({ success: true });
    const engine = new ChatbotEngine(context({
      config: "agent",
      tools: [scheduleContactTool],
      userId: "user-1",
      agentId: "agent-1",
    }));
    engine.registerTool("schedule_contact", handler);

    const response = await engine.chat({
      message: "Change my CRM record",
      conversationId: "conversation-1",
    });

    const firstModelRequest = messagesCreateMock.mock.calls[0]?.[0] as {
      tools?: Anthropic.Tool[];
    };
    expect(firstModelRequest.tools).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
    expect(response.toolResults).toEqual([
      {
        name: "schedule_contact",
        result: { error: "Unavailable tool: schedule_contact" },
      },
    ]);
  });
});
