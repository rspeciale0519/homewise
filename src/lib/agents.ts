import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import type { Prisma, PrismaClient, Agent } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface CreateAgentInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  languages?: string[];
  designations?: string[];
  active?: boolean;
  mlsAgentId?: string | null;
  emailSignature?: string | null;
  emailTagline?: string | null;
  brandColor?: string | null;
}

/**
 * Creates an Agent with a unique slug (collision-suffixed). Accepts an optional
 * transaction client so callers can create an agent atomically with related writes.
 */
export async function createAgentRecord(input: CreateAgentInput, db: Db = prisma): Promise<Agent> {
  let slug = generateSlug(input.firstName, input.lastName);

  const existing = await db.agent.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  return db.agent.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email || null,
      phone: input.phone || null,
      photoUrl: input.photoUrl || null,
      bio: input.bio || null,
      languages: input.languages ?? [],
      designations: input.designations ?? [],
      active: input.active ?? true,
      mlsAgentId: normalizeMlsAgentId(input.mlsAgentId),
      emailSignature: input.emailSignature || null,
      emailTagline: input.emailTagline || null,
      brandColor: input.brandColor || null,
      slug,
    },
  });
}
