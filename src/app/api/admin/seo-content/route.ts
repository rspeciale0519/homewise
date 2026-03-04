import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const content = await prisma.seoContent.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    content.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      publishedAt: c.publishedAt?.toISOString() ?? null,
      refreshedAt: c.refreshedAt?.toISOString() ?? null,
    }))
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const { id, ...data } = body as {
    id: string;
    title?: string;
    body?: string;
    metaTitle?: string;
    metaDesc?: string;
    status?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.status === "published") {
    updateData.publishedAt = new Date();
  }

  const updated = await prisma.seoContent.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
