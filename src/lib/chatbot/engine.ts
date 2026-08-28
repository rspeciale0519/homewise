import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getModelForFeature } from "@/lib/ai";
import { canAccessConversation } from "./conversation-access";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const BLOCKED_AGENT_TOOLS = new Set(["schedule_contact"]);
const TOOL_LIMIT_MESSAGE =
  "I could not complete this request safely. Please try a simpler request.";

export const MAX_TOOL_ROUNDS = 3;

export interface ContextBundle {
  config: "public" | "agent" | "dashboard";
  systemPrompt: string;
  tools: Anthropic.Tool[];
  userId?: string;
  agentId?: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface ChatInput {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  conversationId: string;
  content: string;
  toolResults?: Array<{ name: string; result: unknown }>;
}

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

export class ChatbotEngine {
  private context: ContextBundle;
  private toolHandlers: Map<string, ToolHandler> = new Map();

  constructor(context: ContextBundle) {
    this.context = context;
  }

  registerTool(name: string, handler: ToolHandler): void {
    this.toolHandlers.set(name, handler);
  }

  async chat(input: ChatInput): Promise<ChatResponse> {
    if (input.conversationId) {
      await this.assertConversationAccess(input.conversationId);
    }

    const featureKeyMap = { public: "public_chatbot", agent: "agent_website_chatbot", dashboard: "dashboard_chatbot" } as const;
    const featureKey = featureKeyMap[this.context.config];
    const model = await getModelForFeature(featureKey);
    const availableTools = this.context.tools.filter((tool) =>
      this.isToolAllowed(tool.name),
    );
    const systemPrompt = this.context.config === "agent"
      ? `${this.context.systemPrompt}\n\nDo not use schedule_contact. Direct visitors to the contact form instead.`
      : this.context.systemPrompt;

    let conversationId = input.conversationId;

    if (!conversationId) {
      const conversation = await prisma.conversation.create({
        data: {
          sessionId: this.context.sessionId,
          userId: this.context.userId ?? null,
          agentId: this.context.agentId ?? null,
          config: this.context.config,
          metadata: this.context.metadata ? JSON.parse(JSON.stringify(this.context.metadata)) : undefined,
        },
      });
      conversationId = conversation.id;
    }

    await prisma.chatMessage.create({
      data: { conversationId, role: "user", content: input.message },
    });

    const history = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    });

    const messages: Anthropic.MessageParam[] = history.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      tools: availableTools.length > 0 ? availableTools : undefined,
      messages,
    });

    const toolResults: Array<{ name: string; result: unknown }> = [];
    let toolRounds = 0;

    while (response.stop_reason === "tool_use" && toolRounds < MAX_TOOL_ROUNDS) {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      if (toolUseBlocks.length === 0) break;
      toolRounds += 1;

      const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const handler = this.isToolAllowed(toolUse.name)
          ? this.toolHandlers.get(toolUse.name)
          : undefined;
        let result: unknown;
        if (handler) {
          result = await handler(toolUse.input as Record<string, unknown>);
        } else {
          result = { error: `Unavailable tool: ${toolUse.name}` };
        }
        toolResults.push({ name: toolUse.name, result });
        toolResultContents.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result) ?? "null",
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResultContents });

      response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        tools: availableTools.length > 0 ? availableTools : undefined,
        messages,
      });
    }

    const textContent = response.content.find((c) => c.type === "text");
    const content = response.stop_reason === "tool_use"
      ? TOOL_LIMIT_MESSAGE
      : textContent && "text" in textContent
        ? textContent.text
        : "";

    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content,
        toolCalls: toolResults.length > 0 ? JSON.parse(JSON.stringify(toolResults)) : undefined,
        tokenCount: response.usage.output_tokens,
      },
    });

    return { conversationId, content, toolResults };
  }

  private isToolAllowed(name: string): boolean {
    return !(this.context.config === "agent" && BLOCKED_AGENT_TOOLS.has(name));
  }

  private async assertConversationAccess(conversationId: string): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        config: true,
        sessionId: true,
        userId: true,
        agentId: true,
      },
    });

    if (!conversation || !canAccessConversation(conversation, this.context)) {
      throw new Error("Conversation access denied");
    }
  }
}
