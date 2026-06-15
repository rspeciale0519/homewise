import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { adminApplicationFilterSchema } from "@/schemas/agent-application.schema";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminApplicationFilterSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { search, status, page, perPage } = parsed.data;

  const where: Prisma.AgentApplicationWhereInput = {};

  if (status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [applications, total] = await Promise.all([
      prisma.agentApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.agentApplication.count({ where }),
    ]);

    return NextResponse.json({
      applications,
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
