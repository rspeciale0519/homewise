import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

interface AgentMetrics {
  agentId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  leads: number;
  contacts: number;
  showings: number;
  offers: number;
  closings: number;
  pipelineValue: number;
  emailsSent: number;
  emailOpens: number;
  avgScore: number;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
  const dateTo = to ? new Date(to) : new Date();

  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: { id: true, firstName: true, lastName: true, photoUrl: true },
    orderBy: { lastName: "asc" },
  });

  const metrics: AgentMetrics[] = [];

  for (const agent of agents) {
    const [contacts, activities, transactions, emailEvents] = await Promise.all([
      prisma.contact.findMany({
        where: {
          assignedAgentId: agent.id,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { id: true, stage: true, score: true, type: true },
      }),
      prisma.activityEvent.findMany({
        where: {
          contact: { assignedAgentId: agent.id },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { type: true },
      }),
      prisma.transaction.findMany({
        where: {
          contact: { assignedAgentId: agent.id },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { status: true, purchasePrice: true },
      }),
      prisma.emailEvent.findMany({
        where: {
          contact: { assignedAgentId: agent.id },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { type: true },
      }),
    ]);

    const leads = contacts.filter((c) => c.stage === "new_lead").length;
    const showings = activities.filter((a) => a.type === "showing_scheduled" || a.type === "showing").length;
    const offers = activities.filter((a) => a.type === "offer_submitted" || a.type === "offer").length;
    const closings = transactions.filter((t) => t.status === "closed").length;
    const pipelineValue = transactions
      .filter((t) => t.status === "active" || t.status === "pending")
      .reduce((sum, t) => sum + t.purchasePrice, 0);
    const emailsSent = emailEvents.filter((e) => e.type === "sent" || e.type === "delivered").length;
    const emailOpens = emailEvents.filter((e) => e.type === "opened").length;
    const avgScore = contacts.length > 0
      ? Math.round(contacts.reduce((sum, c) => sum + c.score, 0) / contacts.length)
      : 0;

    metrics.push({
      agentId: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      photoUrl: agent.photoUrl,
      leads,
      contacts: contacts.length,
      showings,
      offers,
      closings,
      pipelineValue,
      emailsSent,
      emailOpens,
      avgScore,
    });
  }

  const totals = metrics.reduce(
    (acc, m) => ({
      leads: acc.leads + m.leads,
      contacts: acc.contacts + m.contacts,
      showings: acc.showings + m.showings,
      offers: acc.offers + m.offers,
      closings: acc.closings + m.closings,
      pipelineValue: acc.pipelineValue + m.pipelineValue,
      emailsSent: acc.emailsSent + m.emailsSent,
      emailOpens: acc.emailOpens + m.emailOpens,
    }),
    { leads: 0, contacts: 0, showings: 0, offers: 0, closings: 0, pipelineValue: 0, emailsSent: 0, emailOpens: 0 },
  );

  return NextResponse.json({ agents: metrics, totals, dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() });
}
