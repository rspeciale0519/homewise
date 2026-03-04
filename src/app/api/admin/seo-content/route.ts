import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const content = await prisma.seoContent.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(content);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: string; status: string };

    const updated = await prisma.seoContent.update({
      where: { id: body.id },
      data: {
        status: body.status,
        publishedAt: body.status === "published" ? new Date() : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}
