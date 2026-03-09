import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  source: z.string().optional(),
  type: z.string().optional(),
  stage: z.string().optional(),
  score: z.number().optional(),
  assignedAgentId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  closeAnniversary: z.string().optional().nullable(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      assignedAgent: { select: { id: true, firstName: true, lastName: true } },
      tags: { include: { tag: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      tasks: { orderBy: { dueDate: "asc" } },
      transactions: {
        include: {
          milestones: { orderBy: { sortOrder: "asc" } },
          documents: true,
        },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { birthday, closeAnniversary, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (birthday !== undefined) data.birthday = birthday ? new Date(birthday) : null;
  if (closeAnniversary !== undefined) data.closeAnniversary = closeAnniversary ? new Date(closeAnniversary) : null;

  const contact = await prisma.contact.update({
    where: { id },
    data,
    include: {
      assignedAgent: { select: { id: true, firstName: true, lastName: true } },
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json(contact);
}
