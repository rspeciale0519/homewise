import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { billingAgentFilterSchema } from "@/schemas/billing.schema";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = billingAgentFilterSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { search, status, bundle, page, perPage } = parsed.data;

  const where: Prisma.AgentWhereInput = { active: true };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status !== "all") {
    where.subscription = { status };
  }

  if (bundle) {
    where.subscription = {
      ...((where.subscription as Prisma.SubscriptionWhereInput) ?? {}),
      items: { some: { productType: bundle } },
    };
  }

  try {
    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          stripeCustomer: true,
          subscription: { include: { items: true } },
        },
        orderBy: { lastName: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.agent.count({ where }),
    ]);

    return NextResponse.json({ agents, total, page, perPage });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
