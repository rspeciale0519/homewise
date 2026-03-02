import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { adminSubmissionFilterSchema } from "@/schemas/admin-submission.schema";
import type { Prisma } from "@prisma/client";

interface SubmissionRow {
  id: string;
  type: "contact" | "evaluation" | "buyer";
  name: string;
  email: string;
  status: string;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminSubmissionFilterSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { type, status, search, page, perPage } = parsed.data;

  try {
    const types = type === "all" ? ["contact", "evaluation", "buyer"] as const : [type] as const;
    const rows: SubmissionRow[] = [];
    let grandTotal = 0;

    for (const t of types) {
      const where = buildWhere(t, status, search);
      const [items, count] = await fetchByType(t, where);
      rows.push(...items);
      grandTotal += count;
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paged = rows.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({
      submissions: paged,
      total: grandTotal,
      page,
      perPage,
      totalPages: Math.ceil(grandTotal / perPage),
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

function buildWhere(
  _type: string,
  status: string,
  search?: string
): Prisma.ContactSubmissionWhereInput {
  const where: Prisma.ContactSubmissionWhereInput = {};

  if (status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

async function fetchByType(
  type: "contact" | "evaluation" | "buyer",
  where: Prisma.ContactSubmissionWhereInput
): Promise<[SubmissionRow[], number]> {
  switch (type) {
    case "contact": {
      const [items, count] = await Promise.all([
        prisma.contactSubmission.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.contactSubmission.count({ where }),
      ]);
      return [
        items.map((i) => ({ id: i.id, type: "contact", name: i.name, email: i.email, status: i.status, createdAt: i.createdAt })),
        count,
      ];
    }
    case "evaluation": {
      const [items, count] = await Promise.all([
        prisma.homeEvaluation.findMany({
          where: where as Prisma.HomeEvaluationWhereInput,
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.homeEvaluation.count({ where: where as Prisma.HomeEvaluationWhereInput }),
      ]);
      return [
        items.map((i) => ({ id: i.id, type: "evaluation", name: i.name, email: i.email, status: i.status, createdAt: i.createdAt })),
        count,
      ];
    }
    case "buyer": {
      const [items, count] = await Promise.all([
        prisma.buyerRequest.findMany({
          where: where as Prisma.BuyerRequestWhereInput,
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.buyerRequest.count({ where: where as Prisma.BuyerRequestWhereInput }),
      ]);
      return [
        items.map((i) => ({ id: i.id, type: "buyer", name: i.name, email: i.email, status: i.status, createdAt: i.createdAt })),
        count,
      ];
    }
  }
}
