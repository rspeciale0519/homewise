import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  search: z.string().optional(),
  stage: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
  tag: z.string().optional(),
  assignedAgentId: z.string().optional(),
  sortBy: z.enum(["newest", "oldest", "name_asc", "name_desc", "score_desc"]).optional(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(25),
});

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
  stage: z.string().optional(),
  assignedAgentId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { search, stage, source, type, tag, assignedAgentId, sortBy, page, perPage } = parsed.data;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (type) where.type = type;
  if (assignedAgentId) where.assignedAgentId = assignedAgentId;
  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  const orderBy = sortBy === "oldest" ? { createdAt: "asc" as const }
    : sortBy === "name_asc" ? { firstName: "asc" as const }
    : sortBy === "name_desc" ? { firstName: "desc" as const }
    : sortBy === "score_desc" ? { score: "desc" as const }
    : { createdAt: "desc" as const };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        assignedAgent: { select: { id: true, firstName: true, lastName: true } },
        tags: { include: { tag: true } },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({
    contacts,
    total,
    totalPages: Math.ceil(total / perPage),
    currentPage: page,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { tags, ...data } = parsed.data;

  const contact = await prisma.contact.create({
    data: {
      ...data,
      ...(tags && tags.length > 0
        ? {
            tags: {
              create: tags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            },
          }
        : {}),
    },
    include: {
      assignedAgent: { select: { id: true, firstName: true, lastName: true } },
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
