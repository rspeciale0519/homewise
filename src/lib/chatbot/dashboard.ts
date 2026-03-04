import type Anthropic from "@anthropic-ai/sdk";
import { ChatbotEngine, type ContextBundle } from "./engine";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `You are the Homewise Dashboard Assistant, helping real estate agents manage their business.

You have access to live platform data including leads, tasks, contacts, and training materials.
Answer questions about their business metrics, help them find information, and surface relevant training content.

Be concise and data-driven. When sharing metrics, use specific numbers. When suggesting training content, link to relevant materials.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_lead_stats",
    description: "Get lead and contact statistics for the agent",
    input_schema: {
      type: "object" as const,
      properties: {
        timeframe: { type: "string", description: "Time period: today, this_week, this_month, all", enum: ["today", "this_week", "this_month", "all"] },
      },
    },
  },
  {
    name: "get_tasks",
    description: "Get the agent's pending and upcoming tasks",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["pending", "completed", "overdue"] },
      },
    },
  },
  {
    name: "search_contacts",
    description: "Search contacts by name, email, or stage",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        stage: { type: "string", description: "Filter by pipeline stage" },
      },
    },
  },
  {
    name: "find_training",
    description: "Search training content by topic or keyword",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Topic or keyword to search" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_pipeline_summary",
    description: "Get a summary of the agent's pipeline by stage",
    input_schema: { type: "object" as const, properties: {} },
  },
];

export function createDashboardChatbot(sessionId: string, userId: string, agentId?: string): ChatbotEngine {
  const context: ContextBundle = {
    config: "dashboard",
    systemPrompt: SYSTEM_PROMPT,
    tools: TOOLS,
    sessionId,
    userId,
    agentId,
  };

  const engine = new ChatbotEngine(context);

  engine.registerTool("get_lead_stats", async (input) => {
    const timeframe = (input.timeframe as string) ?? "this_week";
    let since: Date;
    const now = new Date();

    switch (timeframe) {
      case "today": since = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case "this_week": since = new Date(now.getTime() - 7 * 86400000); break;
      case "this_month": since = new Date(now.getFullYear(), now.getMonth(), 1); break;
      default: since = new Date(0);
    }

    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (agentId) where.assignedAgentId = agentId;

    const [totalLeads, newLeads, contactedLeads] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.count({ where: { ...where, stage: "new_lead" } }),
      prisma.contact.count({ where: { ...where, stage: "contacted" } }),
    ]);

    return { timeframe, totalLeads, newLeads, contactedLeads };
  });

  engine.registerTool("get_tasks", async (input) => {
    const status = (input.status as string) ?? "pending";
    const where: Record<string, unknown> = {};
    if (agentId) where.assignedTo = agentId;

    if (status === "pending") {
      where.completedAt = null;
    } else if (status === "completed") {
      where.completedAt = { not: null };
    } else if (status === "overdue") {
      where.completedAt = null;
      where.dueDate = { lt: new Date() };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { contact: { select: { firstName: true, lastName: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      contact: t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : null,
    }));
  });

  engine.registerTool("search_contacts", async (input) => {
    const query = (input.query as string) ?? "";
    const stage = input.stage as string | undefined;
    const where: Record<string, unknown> = {};
    if (agentId) where.assignedAgentId = agentId;
    if (stage) where.stage = stage;
    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, stage: true, score: true },
      orderBy: { score: "desc" },
      take: 10,
    });

    return contacts;
  });

  engine.registerTool("find_training", async (input) => {
    const query = (input.query as string).toLowerCase();
    const content = await prisma.trainingContent.findMany({
      where: {
        published: true,
        audience: { in: ["agent", "both"] },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { tags: { has: query } },
        ],
      },
      select: { id: true, title: true, type: true, category: true, url: true, duration: true },
      take: 5,
    });

    return content;
  });

  engine.registerTool("get_pipeline_summary", async () => {
    const where: Record<string, unknown> = {};
    if (agentId) where.assignedAgentId = agentId;

    const stages = await prisma.contact.groupBy({
      by: ["stage"],
      where,
      _count: true,
    });

    return stages.map((s) => ({ stage: s.stage, count: s._count }));
  });

  return engine;
}
