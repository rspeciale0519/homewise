import { NextRequest, NextResponse } from "next/server";
import { agentFilterSchema } from "@/schemas/agent-filter.schema";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = agentFilterSchema.safeParse({
    language: searchParams.get("language") ?? undefined,
    letter: searchParams.get("letter") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filter parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { language, letter, search, page } = parsed.data;
  const perPage = 12;

  const where: Prisma.AgentWhereInput = { active: true };

  if (language) {
    where.languages = { has: language };
  }

  if (letter) {
    where.lastName = { startsWith: letter, mode: "insensitive" };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
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
      totalPages: Math.ceil(total / perPage),
      currentPage: page,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
