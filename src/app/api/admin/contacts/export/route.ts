import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const stage = request.nextUrl.searchParams.get("stage") ?? undefined;
  const source = request.nextUrl.searchParams.get("source") ?? undefined;
  const type = request.nextUrl.searchParams.get("type") ?? undefined;

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (type) where.type = type;

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      assignedAgent: { select: { firstName: true, lastName: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "First Name", "Last Name", "Email", "Phone", "Source", "Type",
    "Stage", "Score", "Assigned Agent", "Tags", "Created At",
  ];

  const rows = contacts.map((c) => [
    c.firstName,
    c.lastName,
    c.email,
    c.phone ?? "",
    c.source,
    c.type,
    c.stage,
    String(c.score),
    c.assignedAgent ? `${c.assignedAgent.firstName} ${c.assignedAgent.lastName}` : "",
    c.tags.map((t) => t.tag.name).join("; "),
    c.createdAt.toISOString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
