import type Anthropic from "@anthropic-ai/sdk";
import { ChatbotEngine, type ContextBundle } from "./engine";
import { prisma } from "@/lib/prisma";

interface AgentConfig {
  agentId: string;
  agentName: string;
  agentBio?: string;
  tagline?: string;
  tone?: string;
  clientType?: string;
  sessionId: string;
  userId?: string;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_agent_listings",
    description: "Get the agent's active listings",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Listing status filter", enum: ["Active", "Pending", "Sold"] },
      },
    },
  },
  {
    name: "qualify_lead",
    description: "Gather lead qualification info from the visitor",
    input_schema: {
      type: "object" as const,
      properties: {
        buyerOrSeller: { type: "string", enum: ["buyer", "seller", "both"] },
        timeline: { type: "string", description: "When they want to buy/sell" },
        budget: { type: "string", description: "Their budget or price range" },
        areas: { type: "string", description: "Areas of interest" },
      },
      required: ["buyerOrSeller"],
    },
  },
  {
    name: "schedule_contact",
    description: "Help the visitor schedule a contact or showing with the agent",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        message: { type: "string" },
      },
      required: ["name", "email"],
    },
  },
];

export function createAgentChatbot(config: AgentConfig): ChatbotEngine {
  const tone = config.tone ?? "professional and friendly";
  const systemPrompt = `You are a virtual assistant for ${config.agentName}, a real estate agent at Homewise FL.
${config.tagline ? `Tagline: "${config.tagline}"` : ""}
${config.agentBio ? `About the agent: ${config.agentBio}` : ""}
${config.clientType ? `Primary client type: ${config.clientType}` : ""}

Your tone should be ${tone}. Help visitors learn about ${config.agentName}'s listings, qualify leads, and schedule appointments.

When a visitor shows buying intent (asks about specific properties, mentions budget, timeline), use the qualify_lead tool.
When they want to get in touch, use the schedule_contact tool.
Always represent ${config.agentName} professionally and encourage visitors to connect.`;

  const context: ContextBundle = {
    config: "agent",
    systemPrompt,
    tools: TOOLS,
    sessionId: config.sessionId,
    agentId: config.agentId,
    userId: config.userId,
  };

  const engine = new ChatbotEngine(context);

  engine.registerTool("get_agent_listings", async (input) => {
    const agent = await prisma.agent.findUnique({
      where: { id: config.agentId },
      select: { mlsAgentId: true },
    });

    if (!agent?.mlsAgentId) return { listings: [] };

    const listings = await prisma.listing.findMany({
      where: {
        listingAgentMlsId: agent.mlsAgentId,
        status: (input.status as string) ?? "Active",
      },
      select: { mlsId: true, address: true, city: true, price: true, beds: true, baths: true, sqft: true, status: true },
      orderBy: { price: "desc" },
      take: 10,
    });

    return { listings };
  });

  engine.registerTool("qualify_lead", async (input) => {
    return {
      qualified: true,
      summary: `Lead interested as ${input.buyerOrSeller}${input.timeline ? `, timeline: ${input.timeline}` : ""}${input.budget ? `, budget: ${input.budget}` : ""}${input.areas ? `, areas: ${input.areas}` : ""}`,
    };
  });

  engine.registerTool("schedule_contact", async (input) => {
    const nameParts = (input.name as string).split(" ");
    const firstName = nameParts[0] ?? (input.name as string);
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    await prisma.contact.upsert({
      where: { email: input.email as string },
      create: {
        firstName,
        lastName,
        email: input.email as string,
        phone: (input.phone as string) ?? null,
        source: "chatbot",
        type: "buyer",
        stage: "new_lead",
        assignedAgentId: config.agentId,
      },
      update: { phone: (input.phone as string) ?? undefined },
    });

    return { success: true, message: `${config.agentName} will be in touch soon!` };
  });

  return engine;
}
