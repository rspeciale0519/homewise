import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { adminAgentFilterSchema, adminAgentCreateSchema } from "@/schemas/admin-agent.schema";
import { generateSlug } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminAgentFilterSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { search, active, page, perPage } = parsed.data;

  const where: Prisma.AgentWhereInput = {};

  if (active !== "all") {
    where.active = active === "true";
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: { lastName: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.agent.count({ where }),
    ]);

    return NextResponse.json({
      agents,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const body: unknown = await request.json();
    const parsed = adminAgentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let slug = generateSlug(data.firstName, data.lastName);

    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const agent = await prisma.agent.create({
      data: {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        photoUrl: data.photoUrl || null,
        bio: data.bio || null,
        slug,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
