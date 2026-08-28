import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const toggleSchema = z.object({
  active: z.boolean(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = toggleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.propertyAlert.updateMany({
      where: {
        id,
        ...(parsed.data.active ? { verificationRequired: false } : {}),
      },
      data: { active: parsed.data.active },
    });

    if (result.count !== 1) {
      const alert = await prisma.propertyAlert.findUnique({
        where: { id },
        select: { verificationRequired: true },
      });
      if (!alert) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "The email address must be confirmed before this alert can be activated." },
        { status: 409 },
      );
    }

    const updated = await prisma.propertyAlert.findUnique({ where: { id } });

    return NextResponse.json({ alert: updated });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
