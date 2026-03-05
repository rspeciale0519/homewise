import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface LogActivityInput {
  contactId: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logActivity({ contactId, type, title, description, metadata }: LogActivityInput) {
  return prisma.activityEvent.create({
    data: { contactId, type, title, description, metadata },
  });
}

export async function logActivityByEmail(email: string, type: string, title: string, description?: string, metadata?: Prisma.InputJsonValue) {
  const contact = await prisma.contact.findUnique({ where: { email }, select: { id: true } });
  if (!contact) return null;
  return logActivity({ contactId: contact.id, type, title, description, metadata });
}
