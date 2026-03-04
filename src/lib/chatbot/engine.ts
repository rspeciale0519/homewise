import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

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
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: this.context.systemPrompt,
      tools: this.context.tools.length > 0 ? this.context.tools : undefined,
      messages,
    });

    const toolResults: Array<{ name: string; result: unknown }> = [];

    // Handle tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const handler = this.toolHandlers.get(toolUse.name);
        let result: unknown;
        if (handler) {
          result = await handler(toolUse.input as Record<string, unknown>);
        } else {
          result = { error: `Unknown tool: ${toolUse.name}` };
        }
        toolResults.push({ name: toolUse.name, result });
        toolResultContents.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResultContents });

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: this.context.systemPrompt,
        tools: this.context.tools,
        messages,
      });
    }

    const textContent = response.content.find((c) => c.type === "text");
    const content = textContent && "text" in textContent ? textContent.text : "";

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
}
