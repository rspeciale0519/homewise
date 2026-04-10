import { prisma } from "@/lib/prisma";

/**
 * Resolves the agent ID for a given user. Checks the AgentUser relation first,
 * then falls back to looking up the Agent by email match.
 * Returns null if no agent profile is found (not an error — the user may not
 * have an agent record yet).
 */
export async function getAgentId(userId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      role: true,
      email: true,
      agentProfile: { select: { id: true } },
    },
  });

  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return null;
  }

  // Direct link via Agent.userId
  if (profile.agentProfile?.id) {
    return profile.agentProfile.id;
  }

  // Fallback: match agent by email
  const agent = await prisma.agent.findFirst({
    where: { email: profile.email, active: true },
    select: { id: true },
  });

  return agent?.id ?? null;
}
