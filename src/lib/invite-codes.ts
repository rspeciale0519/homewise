import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

const INVITE_CODE_LENGTH = 21;
const INVITE_EXPIRY_DAYS = 7;

export function generateInviteCode(): string {
  return nanoid(INVITE_CODE_LENGTH);
}

export function getInviteExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + INVITE_EXPIRY_DAYS);
  return date;
}

export async function createInviteCode(agentId: string) {
  const code = generateInviteCode();
  const expiresAt = getInviteExpiryDate();

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      inviteCode: code,
      inviteExpiresAt: expiresAt,
      inviteUsed: false,
    },
    select: {
      id: true,
      inviteCode: true,
      inviteExpiresAt: true,
      inviteUsed: true,
    },
  });

  return agent;
}

export async function validateInviteCode(code: string) {
  const agent = await prisma.agent.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      inviteCode: true,
      inviteExpiresAt: true,
      inviteUsed: true,
      userId: true,
    },
  });

  if (!agent) {
    return { valid: false, reason: "Invalid invite code" } as const;
  }

  if (agent.inviteUsed) {
    return { valid: false, reason: "This invite has already been used" } as const;
  }

  if (agent.userId) {
    return { valid: false, reason: "This agent already has an account" } as const;
  }

  if (agent.inviteExpiresAt && agent.inviteExpiresAt < new Date()) {
    return { valid: false, reason: "This invite has expired" } as const;
  }

  return { valid: true, agent } as const;
}

export async function consumeInviteCode(code: string, userId: string) {
  return prisma.agent.update({
    where: { inviteCode: code },
    data: {
      inviteUsed: true,
      userId,
    },
  });
}
