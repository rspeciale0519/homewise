import { prisma } from "@/lib/prisma";

interface LeadInfo {
  source: string;
  type: string;
  location?: string;
  priceRange?: { min?: number; max?: number };
  language?: string;
}

interface RoutingConditions {
  sources?: string[];
  types?: string[];
  locations?: string[];
  minPrice?: number;
  maxPrice?: number;
  languages?: string[];
}

export async function routeLead(leadInfo: LeadInfo): Promise<string | null> {
  const rules = await prisma.leadRoutingRule.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    const conditions = rule.conditions as RoutingConditions;
    if (matchesConditions(leadInfo, conditions)) {
      return rule.agentId;
    }
  }

  // Round-robin fallback: find agents with round-robin rules
  const roundRobinRules = await prisma.leadRoutingRule.findMany({
    where: { active: true, roundRobin: true },
  });

  if (roundRobinRules.length > 0) {
    // Get agent with fewest recent assignments
    const agentIds = roundRobinRules.map((r) => r.agentId);
    const counts = await prisma.contact.groupBy({
      by: ["assignedAgentId"],
      where: { assignedAgentId: { in: agentIds } },
      _count: true,
    });

    const countMap = new Map(counts.map((c) => [c.assignedAgentId, c._count]));
    let minCount = Infinity;
    let selectedAgent: string | null = null;

    for (const agentId of agentIds) {
      const count = countMap.get(agentId) ?? 0;
      if (count < minCount) {
        minCount = count;
        selectedAgent = agentId;
      }
    }

    return selectedAgent;
  }

  return null;
}

function matchesConditions(lead: LeadInfo, conditions: RoutingConditions): boolean {
  if (conditions.sources?.length && !conditions.sources.includes(lead.source)) return false;
  if (conditions.types?.length && !conditions.types.includes(lead.type)) return false;
  if (conditions.locations?.length && lead.location && !conditions.locations.some((loc) => lead.location!.toLowerCase().includes(loc.toLowerCase()))) return false;
  if (conditions.minPrice !== undefined && lead.priceRange?.min !== undefined && lead.priceRange.min < conditions.minPrice) return false;
  if (conditions.maxPrice !== undefined && lead.priceRange?.max !== undefined && lead.priceRange.max > conditions.maxPrice) return false;
  return true;
}

export async function autoAssignAgent(contactId: string, leadInfo: LeadInfo) {
  const agentId = await routeLead(leadInfo);
  if (agentId) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { assignedAgentId: agentId },
    });
  }
  return agentId;
}
